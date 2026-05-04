/**
 * Prompt for generating chat titles.
 * Extracts a short, descriptive title from user-assistant exchange.
 */
export const TITLE_GENERATION_PROMPT = `Generate a short, neutral chat title based on this exchange:

User: "{USER_MESSAGE}"
Assistant: "{ASSISTANT_MESSAGE}"

Rules:
- Use 3 to 6 words.
- Make it descriptive, not promotional.
- Do not add slogans, subtitles, or taglines.
- Do not use em dashes, colons, or quotation marks.
- Respond with ONLY the title.

Examples:
- "Politics in Nigeria"
- "Quantum Entanglement"
- "Photosynthesis Basics"`;
