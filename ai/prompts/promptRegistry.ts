import { SYSTEM_PROMPT } from "./system.prompt.ts";
import { SAFETY_PROMPT } from "./safety.prompt.ts";
import { CLASSIFIER_PROMPT } from "./classifier.prompt.ts";
import { TOOLS_PROMPT } from "./tools.prompt.ts";
import { FORMATTER_PROMPT, buildFormatterPrompt } from "./formatter.prompt.ts";
import { CODING_PROMPT } from "./coding.prompt.ts";
import { REASONING_PROMPT } from "./reasoning.prompt.ts";
import { PLANNING_PROMPT } from "./planning.prompt.ts";
import { SELF_IMPROVE_PROMPT } from "./self_improve.prompt.ts";
import { buildModePrompt } from "./mode.prompt.ts";
import { SENIOR_ENGINEER_PROMPT } from "./senior-engineer.prompt.ts";
import { HUMANIZATION_PROMPT } from "./humanization.prompt.ts";
import type { PromptBehaviorControls } from "./control.types.ts";
import { DEFAULT_PROMPT_BEHAVIOR_CONTROLS } from "./control.types.ts";
import type { PromptTaskCategory } from "@/ai/graph/state";

export type PromptLayerKey =
  | "foundation"
  | "safety"
  | "mode"
  | "humanization"
  | "task"
  | "formatting"
  | "utility";

export type PromptRegistryEntry = {
  id: string;
  layer: PromptLayerKey;
  version: string;
  content: string;
  tags?: string[];
};

const FOUNDATION_PROMPTS = {
  master: {
    id: "foundation.master.v3",
    layer: "foundation",
    version: "3.0.0",
    content: SYSTEM_PROMPT,
    tags: ["identity", "global", "quality"],
  },
} as const satisfies Record<string, PromptRegistryEntry>;

const SAFETY_PROMPTS = {
  policy: {
    id: "safety.policy.v1",
    layer: "safety",
    version: "1.0.0",
    content: SAFETY_PROMPT,
    tags: ["policy", "risk", "truthfulness"],
  },
} as const satisfies Record<string, PromptRegistryEntry>;

const TASK_PROMPTS = {
  coding: {
    id: "task.coding.v2",
    layer: "task",
    version: "2.0.0",
    content: CODING_PROMPT,
  },
  reasoning: {
    id: "task.reasoning.v2",
    layer: "task",
    version: "2.0.0",
    content: REASONING_PROMPT,
  },
  planning: {
    id: "task.planning.v2",
    layer: "task",
    version: "2.0.0",
    content: PLANNING_PROMPT,
  },
} as const satisfies Record<string, PromptRegistryEntry>;

const HUMANIZATION_PROMPTS = {
  explicit: {
    id: "humanization.explicit.v1",
    layer: "humanization",
    version: "1.0.0",
    content: HUMANIZATION_PROMPT,
    tags: ["tone", "rewrite", "natural-language"],
  },
} as const satisfies Record<string, PromptRegistryEntry>;

const FORMATTING_PROMPTS = {
  default: {
    id: "format.default.v2",
    layer: "formatting",
    version: "2.0.0",
    content: FORMATTER_PROMPT,
  },
} as const satisfies Record<string, PromptRegistryEntry>;

const UTILITY_PROMPTS = {
  classifier: {
    id: "utility.classifier.v2",
    layer: "utility",
    version: "2.0.0",
    content: CLASSIFIER_PROMPT,
  },
  tools: {
    id: "utility.tools.v2",
    layer: "utility",
    version: "2.0.0",
    content: TOOLS_PROMPT,
  },
  selfImprove: {
    id: "utility.self-improve.v1",
    layer: "utility",
    version: "1.0.0",
    content: SELF_IMPROVE_PROMPT,
  },
} as const satisfies Record<string, PromptRegistryEntry>;

export const PROMPT_REGISTRY = {
  foundation: FOUNDATION_PROMPTS,
  safety: SAFETY_PROMPTS,
  mode: {
    id: "mode.dynamic.v1",
    layer: "mode",
    version: "1.0.0",
  },
  humanization: HUMANIZATION_PROMPTS,
  task: TASK_PROMPTS,
  formatting: FORMATTING_PROMPTS,
  utility: UTILITY_PROMPTS,
} as const;

export function getTaskPrompt(taskCategory: PromptTaskCategory): string {
  switch (taskCategory) {
    case "coding":
      return TASK_PROMPTS.coding.content;
    case "reasoning":
    case "explanation":
      return TASK_PROMPTS.reasoning.content;
    case "planning":
    case "trading":
      return TASK_PROMPTS.planning.content;
    default:
      return "";
  }
}

export function getModePrompt(controls: PromptBehaviorControls): string {
  return buildModePrompt(controls);
}

export function getFormatterPrompt(controls?: PromptBehaviorControls): string {
  // If controls are provided, build a controls-aware formatter prompt.
  if (controls) return buildFormatterPrompt(controls);

  // Fallback: return legacy formatter prompt content with default behavior.
  return buildFormatterPrompt(DEFAULT_PROMPT_BEHAVIOR_CONTROLS);
}

export function getSeniorEngineerPrompt(): string {
  return SENIOR_ENGINEER_PROMPT;
}

export function getHumanizationPrompt(): string {
  return HUMANIZATION_PROMPTS.explicit.content;
}

export function getMasterPrompt(): string {
  return FOUNDATION_PROMPTS.master.content;
}

export function getSafetyPrompt(): string {
  return SAFETY_PROMPTS.policy.content;
}

export function getToolsPrompt(): string {
  return UTILITY_PROMPTS.tools.content;
}

export const PROMPTS = {
  system: getMasterPrompt(),
  safety: getSafetyPrompt(),
  classifier: UTILITY_PROMPTS.classifier.content,
  tools: getToolsPrompt(),
  formatter: getFormatterPrompt(),
  humanization: getHumanizationPrompt(),
  coding: TASK_PROMPTS.coding.content,
  reasoning: TASK_PROMPTS.reasoning.content,
  planning: TASK_PROMPTS.planning.content,
  seniorEngineer: SENIOR_ENGINEER_PROMPT,
  selfImprove: UTILITY_PROMPTS.selfImprove.content,
};
