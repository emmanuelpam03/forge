const FORBIDDEN_LINE_PATTERNS = [
  /^\s*\*?\s*Structure\s*:?/i,
  /^\s*\*?\s*System\s*:?/i,
  /^\s*\*?\s*Avoid\s*:?/i,
  /^\s*\*?\s*Specificity\b/i,
  /^\s*\*?\s*Refine\b/i,
];

export function sanitizeAssistantOutput(text: string): string {
  const lines = text.split(/\r?\n/);

  return lines
    .filter((line) => {
      const normalized = line.trim();

      if (!normalized) {
        return true;
      }

      return !FORBIDDEN_LINE_PATTERNS.some((pattern) =>
        pattern.test(normalized),
      );
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
