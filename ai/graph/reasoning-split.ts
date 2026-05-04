export function isAnswerStart(token: string): boolean {
  const normalized = token.trimStart();

  return (
    /^[A-Za-z]/.test(normalized) &&
    !normalized.includes("*") &&
    !normalized.includes("user might") &&
    !normalized.includes("avoid") &&
    !normalized.includes("provide") &&
    !normalized.includes("constraint") &&
    !normalized.includes("refine")
  );
}
