/**
 * Prompt for extracting user insights from conversations.
 * Identifies and records one key fact or preference per exchange.
 */
export const MEMORY_EXTRACTION_PROMPT = `Extract ONE key fact or preference learned from this exchange. 
Be specific and concise (max 10 words).

User: "{USER_MESSAGE}"
Assistant: "{ASSISTANT_MESSAGE}"
Intent: {INTENT}

Examples:
- "User prefers TypeScript over Python"
- "User works in fintech backend systems"
- "User likes concise, bullet-point responses"

Respond with ONLY the extracted fact, nothing else.`;
