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

    // Look for fenced JSON blocks: ```json { ... } ``` or ``` { ... } ```
    // Use a global loop to catch multiple blocks inside the buffer.
    // Capture the inner JSON object as group 1.
    const fencedRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;

    let match = carryover.match(fencedRegex);
    while (match) {
      const idx = match.index ?? 0;
      const fullMatch = match[0];
      const before = carryover.slice(0, idx);
      const jsonText = match[1];
      const after = carryover.slice(idx + fullMatch.length);

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
      match = carryover.match(fencedRegex);
    }

    // To avoid unbounded buffer growth, flush stable prefix that cannot
    // be part of a fence start. Keep a small suffix to allow fence starts
    // split across tokens (e.g., "```js\n{")
    const maxSuffix = 512;
    if (carryover.length > maxSuffix) {
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
