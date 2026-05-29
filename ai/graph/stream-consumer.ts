export function toTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object") {
          const textPart = part as { text?: string; content?: string };
          return textPart.text ?? textPart.content ?? "";
        }

        return "";
      })
      .join("");
  }

  return "";
}

export function extractTextFromModelChunk(chunk: unknown): string {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk && typeof chunk === "object") {
    const tokenChunk = chunk as { content?: unknown; text?: unknown };
    return toTextContent(tokenChunk.content ?? tokenChunk.text);
  }

  return "";
}

const INTERNAL_TRACE_PATTERNS = [
  /<｜DSML｜[^>]*>/g,
  /<\/?｜DSML｜tool_calls>/g,
  /<｜DSML｜invoke[^>]*>/g,
  /^\s*id="t\d+"\s*$/gim,
  /^\s*invoke name=.*$/gim,
  /^\s*tool_calls\s*$/gim,
];

export function sanitizeVisibleAssistantText(text: string): string {
  if (!text) {
    return "";
  }

  let sanitized = text;
  for (const pattern of INTERNAL_TRACE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    !!value &&
    typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] ===
      "function"
  );
}

function findNextFenceStart(text: string, fromIndex = 0): number {
  const jsonFenceIndex = text.indexOf("```json", fromIndex);
  const plainFenceIndex = text.indexOf("```", fromIndex);

  if (jsonFenceIndex === -1) {
    return plainFenceIndex;
  }

  if (plainFenceIndex === -1) {
    return jsonFenceIndex;
  }

  return Math.min(jsonFenceIndex, plainFenceIndex);
}

function scanBalancedJson(text: string, jsonStartIndex: number): number | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = jsonStartIndex; index < text.length; index++) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }

      if (depth < 0) {
        return null;
      }
    }
  }

  return null;
}

function findClosingFenceStart(text: string, fromIndex: number): number | null {
  let index = fromIndex;

  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }

  return text.startsWith("```", index) ? index : null;
}

function extractFencedJsonBlock(text: string):
  | {
      before: string;
      jsonText: string;
      after: string;
    }
  | null {
  const fenceStart = findNextFenceStart(text);

  if (fenceStart === -1) {
    return null;
  }

  const fenceMarker = text.startsWith("```json", fenceStart) ? "```json" : "```";
  const jsonStart = text.indexOf("{", fenceStart + fenceMarker.length);

  if (jsonStart === -1) {
    return null;
  }

  const jsonEnd = scanBalancedJson(text, jsonStart);

  if (jsonEnd === null) {
    return null;
  }

  const closingFenceStart = findClosingFenceStart(text, jsonEnd);

  if (closingFenceStart === null) {
    return null;
  }

  return {
    before: text.slice(0, fenceStart),
    jsonText: text.slice(jsonStart, jsonEnd),
    after: text.slice(closingFenceStart + 3),
  };
}

function hasPendingFence(text: string): boolean {
  let searchIndex = 0;
  let openFenceCount = 0;

  while (searchIndex < text.length) {
    const fenceStart = findNextFenceStart(text, searchIndex);

    if (fenceStart === -1) {
      break;
    }

    openFenceCount = openFenceCount === 0 ? 1 : 0;
    searchIndex = fenceStart + 3;
  }

  return openFenceCount === 1;
}

export async function consumeModelStream(
  tokenStreamOrPromise: unknown,
  onChunk: (chunkText: string) => void,
  onFencedJson?: (jsonText: string) => Promise<void> | void,
): Promise<void> {
  const tokenStream = await tokenStreamOrPromise;

  if (!isAsyncIterable(tokenStream)) {
    throw new TypeError("tokenStream is not async iterable");
  }

  // carryover holds partial text between chunks so we can detect
  // fenced JSON blocks that may span multiple model tokens.
  let carryover = "";

  for await (const token of tokenStream) {
    const raw = extractTextFromModelChunk(token);
    const chunkText = sanitizeVisibleAssistantText(raw);
    if (!chunkText) {
      continue;
    }

    carryover += chunkText;

    let fencedBlock = extractFencedJsonBlock(carryover);
    while (fencedBlock) {
      const { before, jsonText, after } = fencedBlock;

      // Emit visible text before the fenced block
      if (before && before.trim()) {
        onChunk(before);
      }

      // Handle fenced JSON via callback (if provided)
      if (onFencedJson) {
        try {
          // await in case handler performs async work like tool invocation
          // but do not let errors break the stream; log/ignore upstream.
          // eslint-disable-next-line no-console
          await Promise.resolve(onFencedJson(jsonText));
        } catch (err) {
          // swallow errors to avoid breaking streaming
          // eslint-disable-next-line no-console
          console.error("onFencedJson handler failed", err);
        }
      }

      // Continue scanning the remainder
      carryover = after;
      fencedBlock = extractFencedJsonBlock(carryover);
    }

    // To avoid unbounded buffer growth, flush stable prefix that cannot
    // be part of a fence start. Keep a small suffix to allow fence starts
    // split across tokens (e.g., "```js\n{")
    const maxSuffix = 512;
    if (carryover.length > maxSuffix) {
      if (hasPendingFence(carryover)) {
        continue;
      }

      const flushIndex = carryover.length - maxSuffix;
      const toFlush = carryover.slice(0, flushIndex);
      if (toFlush && toFlush.trim()) onChunk(toFlush);
      carryover = carryover.slice(flushIndex);
    }
  }

  // At stream end, emit any remaining visible text (excluding any
  // unclosed fenced block payload - we treat it as visible text if it
  // wasn't a full fenced JSON)
  if (carryover && carryover.trim()) {
    // If there's an unclosed fenced block, strip delimiters if present
    // and emit the rest as visible text.
    const leftover = carryover.replace(/```(?:json)?\s*/g, "").replace(/\s*```/g, "");
    if (leftover && leftover.trim()) onChunk(leftover);
  }
}
