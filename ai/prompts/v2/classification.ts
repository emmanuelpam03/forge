import { CLASSIFIER_PROMPT } from "./classifier.prompt.ts";
import type { PromptTaskCategory } from "../../graph/state.ts";

const ALLOWED_TASK_CATEGORIES: ReadonlySet<PromptTaskCategory> = new Set([
  "coding",
  "reasoning",
  "planning",
  "explanation",
  "trading",
  "general",
]);

export function buildTaskCategoryClassificationMessage(
  userMessage: string,
): string {
  return `${CLASSIFIER_PROMPT}\n\nUser message: "${userMessage}"`;
}

export function normalizeTaskCategory(value: string): PromptTaskCategory {
  const normalized = value.trim().toLowerCase().replace(/^"|"$/g, "");
  if (ALLOWED_TASK_CATEGORIES.has(normalized as PromptTaskCategory)) {
    return normalized as PromptTaskCategory;
  }

  return "general";
}

export function parseTaskCategory(text: string): PromptTaskCategory {
  if (!text) {
    return "general";
  }

  const token = text.trim().split(/\s+/)[0] ?? "";
  return normalizeTaskCategory(token.replace(/[.,!?;:]+$/, ""));
}
