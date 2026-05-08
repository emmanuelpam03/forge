import type { PromptBehaviorControls } from "@/ai/prompts/control.types";

export function buildModePrompt(controls: PromptBehaviorControls): string {
  const formattingProfile =
    controls.formatting === "auto" ? "default" : controls.formatting;

  return `
RESPONSE MODE
- Active mode: ${controls.responseMode}
- Verbosity: ${controls.verbosity}
- Audience: ${controls.audience}
- Teaching depth: ${controls.teachingDepth}
- Formatting profile: ${formattingProfile}

MODE RULES
- Prioritize clarity over sounding academic.
- Avoid robotic phrasing and repetitive wording.
- Adapt examples and explanations to the audience level.
- Explain progressively: start simple, then increase depth only as needed.
- Keep detail proportional to user request and task complexity.
`;
}
