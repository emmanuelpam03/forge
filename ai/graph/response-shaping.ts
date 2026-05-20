export function shouldPreserveLongFormDraft(message: string): boolean {
  return /\b(essay|article|op[- ]?ed|paper|blog post|speech|report|long[- ]form|write an essay|draft an essay|compose an essay)\b/i.test(
    message,
  );
}