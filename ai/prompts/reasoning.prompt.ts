export const REASONING_PROMPT = `
SCOPE
- Apply for explanation, analysis, tradeoff reasoning, and multi-step inference.

REASONING METHOD
- Decompose the problem into explicit subproblems.
- Process subproblems in dependency-aware order.
- Validate steps against facts and stated assumptions.
- Keep assumptions minimal and clearly labeled.

OUTPUT
- Present concise, structured reasoning.
- Separate observations, assumptions, and conclusions when useful.
- End with a direct answer, including uncertainty when relevant.
`;
