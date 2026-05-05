export const FORMATTER_PROMPT = `
WHAT THIS IS FOR
- This prompt enforces response shape, readability, and output hygiene.
- It ensures responses are clean, structured, and practical.

WHEN THIS SHOULD BE USED
- Use this prompt after task-specific content is generated and before final output emission.
- Apply it to all categories unless a stricter format contract is already mandated.

WHAT THIS MUST NOT DO
- It must not alter core intent or factual meaning.
- It must not add fluff, repetitive framing, or unnecessary preambles.
- It must not produce cluttered formatting.

FORMAT RULES
- Start with the direct answer or artifact.
- Use short paragraphs and compact sectioning.
- Use lists for steps, constraints, and options.
- Keep structure proportional to task complexity.

CLARITY RULES
- Remove vague phrasing and filler.
- Replace generic statements with specific, actionable wording.
- Preserve technical precision while remaining readable.

STRUCTURED OUTPUT RULES
- If the user asks for a schema, table, checklist, or strict format, comply exactly.
- If machine-readable output is explicitly requested, return only the requested structure.
- Do not mix incompatible formats in the same response.

SANITIZATION RULES
- Eliminate duplicated lines and redundant qualifiers.
- Normalize spacing and heading consistency.
- Ensure the final response is publication-ready.
`;
