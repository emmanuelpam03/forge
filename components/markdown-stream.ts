export type StreamingMarkdownSlice = {
  markdown: string;
  trailingText: string;
};

function isFenceLine(line: string): { marker: string } | null {
  const trimmed = line.trimStart();
  const match = /^(```+|~~~+)/.exec(trimmed);

  if (!match) {
    return null;
  }

  return {
    marker: match[1],
  };
}

export function splitStreamingMarkdown(
  content: string,
  isStreaming?: boolean,
): StreamingMarkdownSlice {
  if (!isStreaming || content.length === 0) {
    return { markdown: content, trailingText: "" };
  }

  let inFence = false;
  let fenceMarker = "";
  let fenceStartIndex = -1;
  let lastSafeIndex = 0;
  let lineStart = 0;
  let sawNewline = false;
  let lastWasFenceClose = false;

  while (lineStart <= content.length) {
    const newlineIndex = content.indexOf("\n", lineStart);
    const lineEnd = newlineIndex === -1 ? content.length : newlineIndex;
    const line = content.slice(lineStart, lineEnd);
    const fenceInfo = isFenceLine(line);

    if (fenceInfo) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceInfo.marker;
        fenceStartIndex = lineStart;
        lastWasFenceClose = false;
      } else if (fenceInfo.marker === fenceMarker) {
        inFence = false;
        fenceMarker = "";
        fenceStartIndex = -1;
        if (newlineIndex !== -1) {
          lastSafeIndex = newlineIndex + 1;
          lastWasFenceClose = true;
          sawNewline = true;
        }
      }
    } else if (!inFence) {
      if (newlineIndex !== -1) {
        lastSafeIndex = newlineIndex + 1;
        lastWasFenceClose = false;
        sawNewline = true;
      }
    }

    if (newlineIndex === -1) {
      break;
    }

    lineStart = newlineIndex + 1;
  }

  if (inFence && fenceStartIndex >= 0) {
    return {
      markdown: content.slice(0, fenceStartIndex),
      trailingText: "",
    };
  }

  // If we never saw any newline at all, it's safe to return the whole content.
  if (!sawNewline) {
    return { markdown: content, trailingText: "" };
  }

  // If the last fence was just closed and there's trailing text with no
  // terminating newline, include that trailing partial line in the safe
  // markdown (this preserves previous behavior for closed fences).
  if (lastWasFenceClose && lastSafeIndex < content.length) {
    lastSafeIndex = content.length;
  }

  return {
    markdown: content.slice(0, lastSafeIndex),
    trailingText: content.slice(lastSafeIndex),
  };
}