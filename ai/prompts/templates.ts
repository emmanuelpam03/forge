import type { ClassificationIntent } from "@/ai/graph/state";

const TOPIC_PROMPT_TEMPLATES: Record<ClassificationIntent, string> = {
  factual: `
## Topic Template: Factual

- Prioritize verifiable facts and current-state correctness.
- Distinguish known facts from assumptions.
- If freshness may affect correctness, prefer evidence-backed answers.
`,
  reasoning: `
## Topic Template: Reasoning

- Explain the conclusion with clear causal steps.
- Use concise structure and avoid speculative leaps.
- State key assumptions only when necessary for correctness.
`,
  code: `
## Topic Template: Code

- Return implementation-first, production-ready output.
- Prefer existing project patterns and strong typing.
- Include exact commands or configuration only when needed to run successfully.
`,
  creative: `
## Topic Template: Creative

- Match requested tone and audience exactly.
- Deliver one polished final variant unless alternatives are explicitly requested.
- Keep language clear, concrete, and immediately usable.
`,
};

export function buildTopicTemplateLayer(
  intent: ClassificationIntent | null | undefined,
): string {
  if (!intent) {
    return "";
  }

  return TOPIC_PROMPT_TEMPLATES[intent] ?? "";
}
