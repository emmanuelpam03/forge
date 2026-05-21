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

const BROKEN_HEADER = /^\s*[\*\:\-\.]+\s*[A-Z][^.!?]*\s*[\*\:\-]*\s*$/;

const WORD_PREFIXES = new Set([
  "anti",
  "auto",
  "co",
  "de",
  "dis",
  "en",
  "em",
  "extra",
  "geo",
  "hyper",
  "im",
  "in",
  "inter",
  "macro",
  "micro",
  "mid",
  "mis",
  "multi",
  "non",
  "post",
  "pre",
  "re",
  "semi",
  "sub",
  "super",
  "trans",
  "un",
]);

const WORD_SUFFIXES = [
  "ation",
  "isation",
  "ization",
  "ological",
  "ology",
  "ness",
  "periphery",
  "boundary",
  "ment",
  "tion",
  "sion",
  "ical",
  "tive",
  "ative",
  "ology",
];

function repairBrokenWordSpacing(line: string): string {
  const tokens = line.match(/\b[A-Za-z]+\b/g) ?? [];
  let candidateCount = 0;

  for (let index = 0; index < tokens.length - 1; index++) {
    const left = tokens[index];
    const right = tokens[index + 1];
    const leftLower = left.toLowerCase();
    const rightLower = right.toLowerCase();

    const isPrefixSplit = WORD_PREFIXES.has(leftLower) && right.length >= 5;
    const isSuffixSplit = WORD_SUFFIXES.some((suffix) => rightLower === suffix || rightLower.endsWith(suffix));
    const isShortFragmentSplit = left.length <= 2 && right.length >= 4 && right.length <= 8;

    if (isPrefixSplit || isSuffixSplit || isShortFragmentSplit) {
      candidateCount++;
    }
  }

  if (line.length < 60 || candidateCount < 2) {
    return line;
  }

  let repaired = line;

  for (let pass = 0; pass < 3; pass++) {
    const before = repaired;

    repaired = repaired.replace(
      /\b(anti|auto|co|de|dis|en|em|extra|geo|hyper|im|in|inter|macro|micro|mid|mis|multi|non|post|pre|re|semi|sub|super|trans|un)\s+([A-Za-z]{5,})\b/gi,
      "$1$2",
    );

    repaired = repaired.replace(
      /\b([A-Za-z]{3,})\s+(ation|isation|ization|ological|ology|ness|periphery|boundary|ment|tion|sion|ical|tive|ative)\b/gi,
      "$1$2",
    );

    repaired = repaired.replace(/\b([A-Za-z]{1,2})\s+([A-Za-z]{4,8})\b/g, (full, left: string, right: string) => {
      if (right.length > 8) return full;
      return `${left}${right}`;
    });

    if (repaired === before) break;
  }

  return repaired;
}

function stripForbiddenFragments(line: string): string {
  let cleaned = line;
  for (const pattern of INLINE_LABEL_PATTERNS) cleaned = cleaned.replace(pattern, "");
  for (const pattern of FORBIDDEN_LINE_PATTERNS) {
    const m = cleaned.match(pattern);
    if (!m) continue;
    const idx = m.index ?? cleaned.search(pattern);
    cleaned = cleaned.slice(0, idx).trimEnd();
  }
  return cleaned;
}

function normalizeVisibleLine(line: string): string {
  return repairBrokenWordSpacing(line)
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    // unwrap single emphasis like *word* -> word
    .replace(/\*(\S(.*?\S)?)\*/g, "$1")
    // drop leftover stray asterisks
    .replace(/\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type AssistantOutputSanitizerState = {
  insideCodeFence: boolean;
  startedVisibleAnswer: boolean;
};

function looksLikeAnswerStart(line: string): boolean {
  if (line.length < 24) return false;
  if (/^[*-]/.test(line)) return false;
  if (FORBIDDEN_LINE_PATTERNS.some((p) => p.test(line))) return false;
  return /\b(is|are|was|were|has|have|includes|include|consists|means|refers to|involves)\b/i.test(
    line,
  );
}

function shouldSuppressLeadInLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (FORBIDDEN_LINE_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (/^[\)\]\}\*\-\.,\:;]/.test(trimmed)) return true;
  if (/^\s*[\*\-]+/.test(trimmed)) return true;
  if (/^\s*[\*\-]\s*(?:Why|How|What|When|Where|Which|Who)\b/.test(trimmed)) return true;
  if (/^\s*(TEXT|Copy)\s*$/i.test(trimmed)) return true;
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

    if (state.insideCodeFence) continue;
    if (!trimmed) {
      output.push("");
      continue;
    }

    if (
      /^\s*(?:Is|Are|Do|Does|Did|Can|Could|Should|Would|Have|Has|Why|What|Where|When|How)\b.{0,100}\?\s*(?:Yes|No|yes|no|Yeah|Nope|True|False)\s*\.?\s*$/i.test(
        trimmed,
      )
    ) {
      continue;
    }

    if (/\?\s*(?:Yes|No|yeah|nope|true|false)\s*\.?\s*$/i.test(trimmed)) continue;
    if (BROKEN_HEADER.test(trimmed)) continue;
    if (
      /^\s*\*+\s*(?:Paragraph|Heading|Opening|Tone|Core|Drivers|Implications|Structure|System|Check|Body|Framing|Section|Sunset|Intro|Content|Notes?|Overview|Key|Insight|Takeaway)\b/i.test(
        trimmed,
      )
    ) {
      continue;
    }

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
      if (shouldSuppressLeadInLine(trimmed)) continue;
      if (looksLikeAnswerStart(trimmed)) state.startedVisibleAnswer = true;
      else continue;
    }

    const cleaned = normalizeVisibleLine(stripForbiddenFragments(line));
    if (!cleaned) continue;
    output.push(cleaned);
  }

  return {
    text: (function () {
      let joined = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();

      joined = joined
        .split("\n")
        .filter((l) => {
          const t = l.trim();
          if (
            /^\s*(?:\*?\s*)?(?:Is|Are|Do|Does|Did|Can|Could|Should|Would|Have|Has|Why|What|Where|When|How)\b.{0,100}\?\s*(?:Yes|No|yeah|nope|True|False)\s*\.?\s*$/i.test(
              t,
            )
          )
            return false;
          if (/\?\s*(?:Yes|No|yeah|nope|true|false)\s*\.?\s*$/i.test(t)) return false;
          if (/^No\s+(?:\"|fragment|planning|step|instruction|label|outline|template)/i.test(t)) return false;
          if (/^(?:Confident tone|Natural spacing|Clear explanation|Well-structured|Good flow|Complete answer|Full response)/i.test(t)) return false;
          return true;
        })
        .join("\n");

      if (!state.startedVisibleAnswer) {
        const sentenceMatch = joined.match(/([A-Z][^\.!?]{20,}?[\.\!\?])/);
        if (sentenceMatch && sentenceMatch.index !== undefined) {
          let sliced = joined.slice(sentenceMatch.index);
          sliced = sliced.replace(/^[\s\*\:\-\.,'\"]+/g, "").trim();

          if (sliced && /^[a-z]/.test(sliced)) {
            const nextSentence = sliced.match(/[.!?]\s*([A-Z][^\.!?]{20,}?[\.\!\?])/);
            if (nextSentence && nextSentence[1]) sliced = nextSentence[1].replace(/^[\s\*\:\-\.,'\"]+/g, "").trim();
            else return "";
          }

          state.startedVisibleAnswer = true;
          return sliced;
        }

        return "";
      }

      return joined;
    })(),
    state,
  };
}

export function sanitizeAssistantOutput(text: string): string {
  const precleaned = text.replace(/\*(\S(.*?\S)?)\*/g, "$1").replace(/\*/g, "");
  const result = sanitizeAssistantOutputChunk(precleaned, {
    insideCodeFence: false,
    startedVisibleAnswer: false,
  }).text;

  if (!result || !result.trim()) {
    return precleaned.trim();
  }

  return result;
}

function calculateReadabilityScoreFromArrays(
  text: string,
  sentences: string[],
  words: string[],
): number {
  if (!text?.trim() || sentences.length === 0) return 50;

  const avgSentenceLength = words.length / sentences.length;
  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / words.length;

  const passivePattern = /\b(is|are|was|were|been|be|being)\s+\w+ed\b|\bby\s+\w+\b/gi;
  const passiveVoiceCount = (text.match(passivePattern) || []).length;
  const passiveVoiceRatio = passiveVoiceCount / sentences.length;

  let score = 100;
  if (avgSentenceLength > 25) score -= 15;
  else if (avgSentenceLength > 20) score -= 8;
  else if (avgSentenceLength < 8) score -= 5;
  if (avgWordLength > 7) score -= 10;
  if (passiveVoiceRatio > 0.3) score -= 15;
  else if (passiveVoiceRatio > 0.2) score -= 8;

  const sentenceStarters = new Set(sentences.map((s) => s.trim().split(/\s+/)[0]));
  if (sentenceStarters.size / sentences.length > 0.7) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function calculateReadabilityScore(text: string): number {
  if (!text?.trim()) return 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 50;
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  return calculateReadabilityScoreFromArrays(text, sentences, words);
}

export function identifyRedundancy(text: string): string[] {
  const lines = text.split('\n');
  const phraseCounts: Record<string, number> = {};
  const redundant: string[] = [];
  for (const line of lines) {
    const t = line.trim().toLowerCase();
    if (t.length < 10) continue;
    phraseCounts[t] = (phraseCounts[t] || 0) + 1;
    if (phraseCounts[t] === 2) redundant.push(t);
  }
  return redundant;
}

export function detectHallucinationMarkers(text: string): string[] {
  const markers: string[] = [];
  const patterns = [
    /\b(I assume|I believe|probably|maybe|I think|supposedly)\b/gi,
    /\b(I cannot|I don't|I'm not)\s+(certain|sure|aware|confident)\b/gi,
    /\b(unknown|unclear|undefined)\b/gi,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) markers.push(...m.map((s) => s.toLowerCase()));
  }
  return [...new Set(markers)];
}
