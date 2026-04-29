export const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a chat-first AI workspace. Classify the user's message into exactly ONE of these categories:

- "calculation": Math problem, numerical computation, equation solving
- "datetime-query": Asking about current time, date, timezone, scheduling
- "code-request": Asking for code implementation, debugging help, technical solution
- "information-search": Asking to search for information, facts, research
- "chat": General conversation, brainstorming, discussion, or anything else

Rules:
1. Respond ONLY with the category name in lowercase, nothing else
2. If uncertain, default to "chat"
3. Do not include quotes or punctuation in your response

Examples:
User: "What is 42 * 7?" → calculation
User: "What time is it?" → datetime-query
User: "Help me write a React component" → code-request
User: "Search for best practices in TypeScript" → information-search
User: "What do you think about AI?" → chat`;

export function buildIntentClassificationMessage(userMessage: string): string {
  return `${INTENT_CLASSIFICATION_PROMPT}\n\nUser message: "${userMessage}"`;
}
