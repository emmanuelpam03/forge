import { SYSTEM_PROMPT } from "@/ai/prompts/v2/system.prompt";
import { CLASSIFIER_PROMPT } from "@/ai/prompts/v2/classifier.prompt";
import { FORMATTER_PROMPT } from "@/ai/prompts/v2/formatter.prompt";
import { CODING_PROMPT } from "@/ai/prompts/v2/coding.prompt";
import { REASONING_PROMPT } from "@/ai/prompts/v2/reasoning.prompt";
import { PLANNING_PROMPT } from "@/ai/prompts/v2/planning.prompt";
import { SELF_IMPROVE_PROMPT } from "@/ai/prompts/v2/self_improve.prompt";

export const PROMPTS = {
  system: SYSTEM_PROMPT,
  classifier: CLASSIFIER_PROMPT,
  formatter: FORMATTER_PROMPT,
  coding: CODING_PROMPT,
  reasoning: REASONING_PROMPT,
  planning: PLANNING_PROMPT,
  selfImprove: SELF_IMPROVE_PROMPT,
};
