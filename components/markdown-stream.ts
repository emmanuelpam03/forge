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
    marker: match[1].startsWith("`") ? "```" : "~~~",
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
      } else if (fenceInfo.marker === fenceMarker) {
        inFence = false;
        fenceMarker = "";
        fenceStartIndex = -1;
        lastSafeIndex = newlineIndex === -1 ? content.length : newlineIndex + 1;
      }
    } else if (!inFence) {
      lastSafeIndex = newlineIndex === -1 ? content.length : newlineIndex + 1;
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

  return {
    markdown: content.slice(0, lastSafeIndex),
    trailingText: content.slice(lastSafeIndex),
  };
}