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

function isMarkdownBlockBoundary(line: string): boolean {
  const trimmed = line.trimStart();

  if (!trimmed) {
    return false;
  }

  return (
    /^#{1,6}\s+\S/.test(trimmed) ||
    /^[-*+]\s+\S/.test(trimmed) ||
    /^\d+[.)]\s+\S/.test(trimmed) ||
    /^>\s*\S/.test(trimmed) ||
    /^\|.*\|$/.test(trimmed) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed) ||
    /^(?:\*\*|__)?[A-Z][A-Za-z0-9 ()/,&.-]{0,120}:(?:\*\*|__)?\s*(?:\S.*)?$/.test(trimmed)
  );
}

export function normalizeMarkdownForRender(content: string): string {
  if (content.length === 0) {
    return content;
  }

  const lines = content.split("\n");
  const normalized: string[] = [];
  let fenceMarker = "";

  for (const line of lines) {
    const fenceInfo = isFenceLine(line);

    if (fenceInfo) {
      if (!fenceMarker) {
        fenceMarker = fenceInfo.marker;
        normalized.push(line);
        continue;
      }

      if (fenceInfo.marker === fenceMarker) {
        fenceMarker = "";
        normalized.push(line);
        continue;
      }
    }

    if (fenceMarker && isMarkdownBlockBoundary(line)) {
      normalized.push(fenceMarker);
      fenceMarker = "";
    }

    normalized.push(line);
  }

  if (fenceMarker) {
    normalized.push(fenceMarker);
  }

  return normalized.join("\n");
}

export function splitStreamingMarkdown(
  content: string,
  isStreaming?: boolean,
): StreamingMarkdownSlice {
  const normalizedContent = normalizeMarkdownForRender(content);

  if (!isStreaming || content.length === 0) {
    return { markdown: normalizedContent, trailingText: "" };
  }

  let inFence = false;
  let fenceMarker = "";
  let fenceStartIndex = -1;
  let lastSafeIndex = 0;
  let lineStart = 0;
  let sawNewline = false;
  let lastWasFenceClose = false;

  while (lineStart <= normalizedContent.length) {
    const newlineIndex = normalizedContent.indexOf("\n", lineStart);
    const lineEnd = newlineIndex === -1 ? normalizedContent.length : newlineIndex;
    const line = normalizedContent.slice(lineStart, lineEnd);
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
      markdown: normalizedContent.slice(0, fenceStartIndex),
      trailingText: "",
    };
  }

  // If we never saw any newline at all, it's safe to return the whole content.
  if (!sawNewline) {
    return { markdown: normalizedContent, trailingText: "" };
  }

  // If the last fence was just closed and there's trailing text with no
  // terminating newline, include that trailing partial line in the safe
  // markdown (this preserves previous behavior for closed fences).
  if (lastWasFenceClose && lastSafeIndex < normalizedContent.length) {
    lastSafeIndex = normalizedContent.length;
  }

  return {
    markdown: normalizedContent.slice(0, lastSafeIndex),
    trailingText: normalizedContent.slice(lastSafeIndex),
  };
}