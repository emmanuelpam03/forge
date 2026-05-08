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

test("router composes layered master and formatter prompts", () => {
  const source = readWorkspaceFile("ai/prompts/router.ts");

  assert.match(source, /composePromptSegments/);
  assert.match(source, /getMasterPrompt/);
  assert.match(source, /getFormatterPrompt/);
  assert.match(source, /layer: "master-system"/);
  assert.match(source, /layer: "formatting"/);
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

test("router defines response mode mapping for key categories", () => {
  const source = readWorkspaceFile("ai/prompts/router.ts");

  assert.match(source, /case "coding":\s*return "code"/);
  assert.match(source, /case "trading":\s*return "factual"/);
  assert.match(
    source,
    /case "reasoning":\s*case "explanation":\s*return "reasoning"/,
  );
});

test("router includes creative fallback and behavior-control resolution", () => {
  const source = readWorkspaceFile("ai/prompts/router.ts");

  assert.match(source, /creative\|story\|poem\|generate/i);
  assert.match(source, /resolveBehaviorControls/);
  assert.match(source, /promptComposition\.summary/);
  assert.match(source, /precedence/);
});

test("graph state includes prompt behavior control fields", () => {
  const source = readWorkspaceFile("ai/graph/state.ts");

  assert.match(
    source,
    /responseMode: Annotation<ResponseMode \| "auto" \| undefined>/,
  );
  assert.match(
    source,
    /verbosityLevel: Annotation<VerbosityLevel \| "auto" \| undefined>/,
  );
  assert.match(
    source,
    /audienceLevel: Annotation<AudienceLevel \| "auto" \| undefined>/,
  );
  assert.match(
    source,
    /teachingDepth: Annotation<TeachingDepth \| "auto" \| undefined>/,
  );
  assert.match(
    source,
    /formattingProfile: Annotation<FormattingProfile \| "auto" \| undefined>/,
  );
  assert.match(
    source,
    /promptBehavior: Annotation<PromptBehaviorControls \| undefined>/,
  );
});
