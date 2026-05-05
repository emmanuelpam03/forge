export const CLASSIFIER_PROMPT = `
WHAT THIS IS FOR
- This prompt classifies the user request into exactly one task category.
- It is used to route execution to the correct specialist behavior.

WHEN THIS SHOULD BE USED
- Use this prompt immediately after receiving user input and before response generation.
- Run it once per user turn unless an explicit reclassification is requested.

WHAT THIS MUST NOT DO
- It must not answer the user request.
- It must not include reasoning, explanations, markdown, punctuation, or extra tokens.
- It must not output more than one category.

ALLOWED CATEGORIES
- coding
- reasoning
- planning
- explanation
- trading
- general

CLASSIFICATION RULES
- Output exactly one lowercase category token from the allowed list.
- If multiple categories appear relevant, choose the dominant user intent.
- If uncertain, output general.
- Never output synonyms or labels outside the allowed list.

CATEGORY DEFINITIONS
- coding: implementation, debugging, code generation, refactoring, APIs, scripts, architecture changes.
- reasoning: multi-step logic, analytical deduction, formal problem solving, deep inference.
- planning: strategy creation, execution plans, sequencing, milestones, project or business plans.
- explanation: teaching, conceptual breakdowns, comparisons, how/why clarifications.
- trading: market analysis, trading strategy, risk setup, entry/exit frameworks.
- general: casual requests or anything not strongly matching another category.

OUTPUT CONTRACT
- Return only one token.
- Valid examples: coding | reasoning | planning | explanation | trading | general
- Invalid examples: "coding", coding., The answer is coding, coding and planning
`;
