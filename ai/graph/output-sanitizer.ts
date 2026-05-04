const FORBIDDEN_LINE_PATTERNS = [
  /^\s*\*?\s*Structure\s*:?/i,
  /^\s*\*?\s*System\s*:?/i,
  /^\s*\*?\s*Avoid\s*:?/i,
  /^\s*\*?\s*Specificity\b/i,
  /^\s*\*?\s*Refine\b/i,
  /^\s*\*?\s*Insight(?:\s+Layer)?\s*[:\*\-]*/i,
  /^\s*\*?\s*Insight\b[:\*\-]*/i,
  /^\s*\*?\s*Takeaway\b[:\*\-]*/i,
  /^\s*\*+\s*Check\b/i,
  /^\s*Check\b[:\s]*/i,
  /^\s*\*+\s*Take\s*away\b/i,
  /high-performance ai/i,
  /direct, high-signal/i,
  /clear structure/i,
  /factual, specific/i,
  /no fluff/i,
  /no planning steps/i,
  /no instruction labels/i,
  /^\s*\*?\s*(?:Core concept|Drivers|Implications|Opening|Paragraph|Heading|Takeaway|Summary|Notes?|Key points?|Overview|Framework|Architecture)\s*:?/i,
];

const CODE_FENCE_PATTERN = /^\s*```/;

const INLINE_LABEL_PATTERNS = [
  /\*+\s*Check[:\*\-\s]*/gi,
  /Framing\s+Sentence[:\*\-\s]*/gi,
  /\bSentence[:\*\-\s]*/gi,
  /Key\s+Pillars[:\*\-\s]*/gi,
  /Section\s*\d+[:\*\-\s]*/gi,
  /Insight(?:\s+Layer)?[:\*\-\s]*/gi,
  /Take(?:-|\s)?away[:\*\-\s]*/gi,
  /Body\s+Paragraphs[:\*\-\s]*/gi,
  /\*+\s*Did\s+I\b.*$/gi,
];

const PREAMBLE_NOISE =
  /^(?:\*+\s*)?(?:Check\b|Did I\b|Framing\b|Body\b|Section\b|Key\s+Pillars\b|What actually matters|A simple mental model|Takeaway\b|Sunset|Intro|Opening|Paragraph|Heading|Tone|Core|Drivers|Implications|Content|Notes?|Overview)\b/i;

// Lines that are JUST a broken header: punctuation/asterisks + text + nothing else
const BROKEN_HEADER = /^\s*[\*\:\-\.]+\s*[A-Z][^.!?]*\s*[\*\:\-]*\s*$/;

function stripForbiddenFragments(line: string): string {
  let cleaned = line;

  // Remove inline label tokens like "Check:", "Framing Sentence:", "Section 1:", etc.
  for (const p of INLINE_LABEL_PATTERNS) {
    cleaned = cleaned.replace(p, "");
  }

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
  // Only remove bold/italic formatting and excess whitespace
  // Preserve markdown headings and bullet points (they're legitimate structure)
  return line
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

  // Filter lines that are clearly fragments or malformed
  if (/^[\)\]\}\*\-\.\,\:\;]/.test(trimmed)) {
    return true;
  }

  // Filter ANY bullet/asterisk lines until we find real prose (suppress all drafting outline)
  if (/^\s*[\*\-]+/.test(trimmed)) {
    return true;
  }

  // Filter bullet points that are just questions (likely drafting notes)
  if (/^\s*[\*\-]\s*(?:Why|How|What|When|Where|Which|Who)\b/.test(trimmed)) {
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

    // FILTER: Remove checklist Q/A anywhere: "Is X? Yes." or "Are X? Yes."
    if (
      /^\s*(?:Is|Are|Do|Does|Did|Can|Could|Should|Would|Have|Has|Why|What|Where|When|How)\b.{0,100}\?\s*(?:Yes|No|yes|no|Yeah|Nope|True|False)\s*\.?\s*$/i.test(
        trimmed,
      )
    ) {
      continue;
    }

    // FILTER: Remove any line that has "? Yes/No" pattern (catches "*One strong ? Yes" etc.)
    if (/\?\s*(?:Yes|No|yeah|nope|true|false)\s*\.?\s*$/i.test(trimmed)) {
      continue;
    }

    // FILTER: Remove broken headers (lines that are JUST punctuation+heading with no content)
    if (BROKEN_HEADER.test(trimmed)) {
      continue;
    }

    // FILTER: Remove outline template lines even after answer started (catches "*Paragraph 2:", "*Heading 1:", etc)
    // These are drafting artifacts the model includes inline
    if (
      /^\s*\*+\s*(?:Paragraph|Heading|Opening|Tone|Core|Drivers|Implications|Structure|System|Check|Body|Framing|Section|Sunset|Intro|Content|Notes?|Overview|Key|Insight|Takeaway)\b/i.test(
        trimmed,
      )
    ) {
      continue;
    }

    // Aggressively suppress short meta/checklist lines before the visible answer starts
    if (!state.startedVisibleAnswer) {
      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      if (
        PREAMBLE_NOISE.test(trimmed) ||
        (wordCount <= 8 &&
          /\b(Check|Did I|Takeaway|Framing|Section|Body|Key|What actually matters)\b/i.test(
            trimmed,
          ))
      ) {
        continue;
      }
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
    text: (function () {
      let joined = output
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // FINAL PASS: Remove any remaining checklist Q/A lines and meta-commentary
      joined = joined
        .split("\n")
        .filter((l) => {
          const trimmed = l.trim();
          // Remove Q/A style: "Is X? Yes." or "No X" or lines starting with "No \"..."
          if (
            /^\s*(?:\*?\s*)?(?:Is|Are|Do|Does|Did|Can|Could|Should|Would|Have|Has|Why|What|Where|When|How)\b.{0,100}\?\s*(?:Yes|No|yeah|nope|True|False)\s*\.?\s*$/i.test(
              trimmed,
            )
          ) {
            return false;
          }
          // Remove any line ending with "? Yes/No" pattern (catches "*One strong ? Yes" etc.)
          if (/\?\s*(?:Yes|No|yeah|nope|true|false)\s*\.?\s*$/i.test(trimmed)) {
            return false;
          }
          // Remove meta-verification lines: "No "...", "No fragments", "No planning" etc.
          if (
            /^No\s+(?:\"|fragment|planning|step|instruction|label|outline|template)/i.test(
              trimmed,
            )
          ) {
            return false;
          }
          // Remove lines that are pure meta-text about the response
          if (
            /^(?:Confident tone|Natural spacing|Clear explanation|Well-structured|Good flow|Complete answer|Full response)/i.test(
              trimmed,
            )
          ) {
            return false;
          }
          return true;
        })
        .join("\n");

      // If we haven't yet started the visible answer, find a strong opening
      if (!state.startedVisibleAnswer) {
        // Find a complete sentence: starts with A-Z, has substance, ends with .!?
        // Require at least 20 chars of content to avoid fragments
        const sentenceMatch = joined.match(/([A-Z][^\.!?]{20,}?[\.\!\?])/);

        if (sentenceMatch && sentenceMatch.index !== undefined) {
          let sliced = joined.slice(sentenceMatch.index);

          // Remove leading stray punctuation
          sliced = sliced.replace(/^[\s\*\:\-\.,'\"]+/g, "").trim();

          // CRITICAL: If it starts with lowercase, this is a fragment (e.g., "a rentier state...")
          // Skip to the next full uppercase sentence instead
          if (sliced && /^[a-z]/.test(sliced)) {
            // Look for: sentence terminator + whitespace + uppercase letter + content + terminator
            const nextSentence = sliced.match(
              /[.!?]\s*([A-Z][^\.!?]{20,}?[\.\!\?])/,
            );
            if (nextSentence && nextSentence[1]) {
              sliced = nextSentence[1]
                .replace(/^[\s\*\:\-\.,'\"]+/g, "")
                .trim();
            } else {
              // No suitable next sentence found; suppress this chunk
              return "";
            }
          }

          state.startedVisibleAnswer = true;
          return sliced;
        }

        // No suitable sentence found yet; suppress this chunk
        return "";
      }

      return joined;
    })(),
    state,
  };
}

export function sanitizeAssistantOutput(text: string): string {
  return sanitizeAssistantOutputChunk(text, {
    insideCodeFence: false,
    startedVisibleAnswer: false,
  }).text;
}
