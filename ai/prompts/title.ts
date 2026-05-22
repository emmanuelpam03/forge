/**
 * Prompt for generating chat titles.
 * Extracts a short, descriptive title from recent conversation context.
 */
export const TITLE_GENERATION_PROMPT = `Generate a concise, human-like chat title that summarizes the conversation topic.

Conversation:
{CONVERSATION_CONTEXT}

Rules:
- Use 3 to 6 words.
- Prefer semantic topic names, not the user's exact wording.
- Be concise, readable, and context-aware.
- Do not include punctuation unless necessary.
- Do not add filler words, prefixes, or suffixes.
- Respond with ONLY the title.

Examples:
- Modern Leadership Challenges
- Understanding WebSockets
- Ghana Culture and Landmarks
- AI Forex Bot Architecture`;
