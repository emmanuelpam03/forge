import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildTaskCategoryClassificationMessage,
  parseTaskCategory,
} from "../ai/prompts/classification.ts";
import { CLASSIFIER_PROMPT } from "../ai/prompts/classifier.prompt.ts";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("v2 task category parser accepts valid categories and falls back safely", () => {
  assert.equal(parseTaskCategory("coding"), "coding");
  assert.equal(parseTaskCategory("planning."), "planning");
  assert.equal(parseTaskCategory('"reasoning"'), "reasoning");
  assert.equal(parseTaskCategory("unknown-value"), "general");
  assert.equal(parseTaskCategory(""), "general");
});

test("v2 classifier message uses classifier prompt contract", () => {
  const message = buildTaskCategoryClassificationMessage("Build an API route");

  assert.match(message, /WHAT THIS IS FOR/);
  assert.match(message, /ALLOWED CATEGORIES/);
  assert.match(message, /User message: "Build an API route"/);
  assert.ok(message.includes(CLASSIFIER_PROMPT));
});

test("router includes top-level system and formatter layers", () => {
  const source = readWorkspaceFile("ai/prompts/router.ts");

  assert.match(source, /PROMPTS\.system/);
  assert.match(source, /PROMPTS\.formatter/);
  assert.doesNotMatch(source, /PROMPTS_V2_ENABLED/);
  assert.doesNotMatch(source, /CHAT_SYSTEM_PROMPT/);
});

test("graph state defines v2 task category with general default", () => {
  const source = readWorkspaceFile("ai/graph/state.ts");

  assert.match(source, /export type PromptTaskCategory/);
  assert.match(source, /taskCategory: Annotation<PromptTaskCategory>/);
  assert.match(source, /default: \(\) => "general"/);
});

test("classification node emits prompt routing telemetry", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /event: "promptRouting\.decision"/);
  assert.match(source, /specialistPrompt/);
});
