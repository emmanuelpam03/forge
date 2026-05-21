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
): Promise<void> {
  const tokenStream = await tokenStreamOrPromise;

  if (!isAsyncIterable(tokenStream)) {
    throw new TypeError("tokenStream is not async iterable");
  }

  for await (const token of tokenStream) {
    const chunkText = extractTextFromModelChunk(token);
    if (!chunkText) {
      continue;
    }

    onChunk(chunkText);
  }
}
