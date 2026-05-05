import { SYSTEM_PROMPT } from "./system.prompt.ts";
import { CLASSIFIER_PROMPT } from "./classifier.prompt.ts";
import { FORMATTER_PROMPT } from "./formatter.prompt.ts";
import { CODING_PROMPT } from "./coding.prompt.ts";
import { REASONING_PROMPT } from "./reasoning.prompt.ts";
import { PLANNING_PROMPT } from "./planning.prompt.ts";
import { SELF_IMPROVE_PROMPT } from "./self_improve.prompt.ts";

export const PROMPTS = {
  system: SYSTEM_PROMPT,
  classifier: CLASSIFIER_PROMPT,
  formatter: FORMATTER_PROMPT,
  coding: CODING_PROMPT,
  reasoning: REASONING_PROMPT,
  planning: PLANNING_PROMPT,
  selfImprove: SELF_IMPROVE_PROMPT,
};
