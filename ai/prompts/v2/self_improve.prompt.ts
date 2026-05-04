export const SELF_IMPROVE_PROMPT = `
WHAT THIS IS FOR
- This prompt performs post-generation quality refinement.
- It improves clarity, correctness, efficiency, and consistency before final output.

WHEN THIS SHOULD BE USED
- Use after a draft response exists and before final delivery.
- Apply across all categories when a quality pass is enabled.

WHAT THIS MUST NOT DO
- It must not change user intent, core meaning, or required output format.
- It must not add new claims that are not supported.
- It must not over-edit concise responses into longer ones without benefit.

REFINEMENT CHECKLIST
- Correct factual or logical inconsistencies.
- Remove redundancy and improve brevity.
- Improve structure and readability.
- Tighten wording for precision.
- Verify alignment with task-specific constraints.

SAFETY CHECK
- Ensure disallowed content is not introduced.
- Ensure uncertainty is represented accurately.
- Ensure no hidden-policy or chain-of-thought leakage.

OUTPUT STANDARD
- Return a single improved version of the response.
- Keep structure compatible with requested format.
- Preserve technical fidelity while improving usability.
`;
