export const FORMATTER_PROMPT = `
PURPOSE
- Enforce clean, direct, readable output.
- Shape responses for fast comprehension.

RESPONSE MODE MAPPING
When RESPONSE MODE is specified, shape output accordingly:
- 'code': Runnable code first, minimal explanation. Use fenced blocks, one command per line.
- 'factual': Direct answer, then sources if available. Concise prose.
- 'reasoning': Numbered steps showing how the conclusion was reached. Minimize intermediate detail.
- 'creative': Engaging, flexible structure. Avoid generic framing.
- 'chat': Brief, conversational, helpful. No long-form structure.

OUTPUT DISCIPLINE (non-negotiable)
- No filler, preambles, or "here are some general steps" framing.
- No malformed tokens: Keep 'Next.js' (not 'Next. js'), 'npm run dev' (not 'npmrun dev'), 'http://localhost' (not 'http: //localhost').
- Start with direct answer or artifact, not explanation.
- Keep sentences clean and direct, but do not compress away useful explanation or structure.
- In deeper answers, preserve the reasoning flow, examples, and sectioning that improve understanding.
- If a follow-up is useful, keep it brief and natural.

CODE BLOCKS
- Put terminal commands in fenced blocks with one command per line.
- Keep commands copy-paste safe and exact.
- Use proper language tags (bash, tsx, js, etc.).

STRUCTURE
- Use short paragraphs and lists when they improve clarity.
- For deeper explanations, allow multiple sections and fuller paragraphs if they make the answer easier to learn from.
- Whitespace matters: normalize spacing, ensure consistent heading styles.
- Keep structure proportional to task complexity and requested depth.

SANITIZATION
- Eliminate duplicated lines and redundant qualifiers.
- Ensure markdown is balanced and valid.
- Final output should be publication-ready with zero typos or spacing corruption.
`;

import type { PromptBehaviorControls } from "./control.types.ts";

export function buildFormatterPrompt(controls: PromptBehaviorControls): string {
  // Small, high-priority header that communicates selected formatting profile
  // and audience/verbosity so the model can tailor the rest of the formatter
  // guidance that follows.
  const header =
    `FORMATTER PROFILE: ${controls.formatting}\n` +
    `Preferred verbosity: ${controls.verbosity}\n` +
    `Audience level: ${controls.audience}\n` +
    `Response mode hint: ${controls.responseMode}\n\n`;

  // Keep the rich legacy formatter guidance after the small header to avoid
  // invalidating downstream expectations while making the formatter
  // responsive to classifier outputs.
  return header + FORMATTER_PROMPT;
}
