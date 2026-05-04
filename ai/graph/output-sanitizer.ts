const FORBIDDEN_LINE_PATTERNS = [
  /^\s*\*?\s*Structure\s*:?/i,
  /^\s*\*?\s*System\s*:?/i,
  /^\s*\*?\s*Avoid\s*:?/i,
  /^\s*\*?\s*Specificity\b/i,
  /^\s*\*?\s*Refine\b/i,
  /high-performance ai/i,
  /direct, high-signal/i,
  /clear structure/i,
  /factual, specific/i,
  /no fluff/i,
  /no planning steps/i,
  /no instruction labels/i,
];

const CODE_FENCE_PATTERN = /^\s*```/;

function stripForbiddenFragments(line: string): string {
  let cleaned = line;

  for (const pattern of FORBIDDEN_LINE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (!match) {
      continue;
    }

    const matchIndex = match.index ?? cleaned.search(pattern);
    cleaned = cleaned.slice(0, matchIndex).trimEnd();
  }

  return cleaned;
}

function normalizeVisibleLine(line: string): string {
  return line
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\s*[*+-]+\s*/g, "")
    .replace(/^(?=\*)\*+/g, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type AssistantOutputSanitizerState = {
  insideCodeFence: boolean;
  startedVisibleAnswer: boolean;
};

function looksLikeAnswerStart(line: string): boolean {
  if (line.length < 24) {
    return false;
  }

  if (/^[*-]/.test(line)) {
    return false;
  }

  if (FORBIDDEN_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
    return false;
  }

  return /\b(is|are|was|were|has|have|includes|include|consists|means|refers to|involves)\b/i.test(
    line,
  );
}

function shouldSuppressLeadInLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return true;
  }

  if (FORBIDDEN_LINE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (/^\s*\*+\s*\w+/i.test(trimmed)) {
    return true;
  }

  if (/^\s*(TEXT|Copy)\s*$/i.test(trimmed)) {
    return true;
  }

  return /\b(assistant|forge|direct, high-signal|knowledge-based|no tools needed|planning steps|instruction labels)\b/i.test(
    trimmed,
  );
}

export function sanitizeAssistantOutputChunk(
  text: string,
  state: AssistantOutputSanitizerState,
): { text: string; state: AssistantOutputSanitizerState } {
  const lines = text.split(/\r?\n/);
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (CODE_FENCE_PATTERN.test(trimmed)) {
      state.insideCodeFence = !state.insideCodeFence;
      continue;
    }

    if (state.insideCodeFence) {
      continue;
    }

    if (!trimmed) {
      output.push("");
      continue;
    }

    if (!state.startedVisibleAnswer) {
      if (shouldSuppressLeadInLine(trimmed)) {
        continue;
      }

      if (looksLikeAnswerStart(trimmed)) {
        state.startedVisibleAnswer = true;
      } else {
        continue;
      }
    }

    const cleaned = normalizeVisibleLine(stripForbiddenFragments(line));

    if (!cleaned) {
      continue;
    }

    output.push(cleaned);
  }

  return {
    text: output
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    state,
  };
}

export function sanitizeAssistantOutput(text: string): string {
  return sanitizeAssistantOutputChunk(text, {
    insideCodeFence: false,
    startedVisibleAnswer: false,
  }).text;
}
