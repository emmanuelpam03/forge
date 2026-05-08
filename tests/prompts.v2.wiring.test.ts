import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildTaskCategoryClassificationMessage,
  parseTaskCategory,
} from "../ai/prompts/classification.ts";
import type { PromptBehaviorControls } from "../ai/prompts/control.types.ts";
import { CLASSIFIER_PROMPT } from "../ai/prompts/classifier.prompt.ts";
import { shouldUseHumanizationMode } from "../ai/prompts/humanization.prompt.ts";

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

test("composer includes dedicated humanization layer ordering", () => {
  const source = readWorkspaceFile("ai/prompts/composer.ts");

  assert.match(source, /\| "humanization"/);
  assert.match(
    source,
    /"mode",\s*\n\s*"persona",\s*\n\s*"humanization",\s*\n\s*"task"/,
  );
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

test("formatter prompt reflects PromptBehaviorControls from classifier", async () => {
  const { getFormatterPrompt } =
    await import("../ai/prompts/promptRegistry.ts");

  const controls: PromptBehaviorControls = {
    responseMode: "code",
    verbosity: "concise",
    audience: "beginner",
    teachingDepth: "minimal",
    formatting: "stepwise",
    persona: "auto",
  };

  const prompt = getFormatterPrompt(controls);

  // Header injected by buildFormatterPrompt
  assert.match(prompt, /FORMATTER PROFILE: stepwise/);
  assert.match(prompt, /Preferred verbosity: concise/);
  assert.match(prompt, /Audience level: beginner/);
  assert.match(prompt, /Response mode hint: code/);
  assert.match(prompt, /Persona mode: auto/);
});

test("humanization trigger only activates on explicit requests", () => {
  assert.equal(
    shouldUseHumanizationMode("Please humanize this message."),
    true,
  );
  assert.equal(
    shouldUseHumanizationMode("Can you make this less robotic?"),
    true,
  );
  assert.equal(
    shouldUseHumanizationMode("Refactor this TypeScript function"),
    false,
  );
  assert.equal(shouldUseHumanizationMode(""), false);
});
