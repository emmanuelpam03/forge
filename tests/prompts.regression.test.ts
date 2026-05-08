import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { SYSTEM_PROMPT } from "../ai/prompts/system.prompt.ts";
import {
  buildFreshnessClassificationMessage as buildFreshnessFromIntent,
  buildIntentClassificationMessage,
} from "../ai/prompts/intent.ts";
import { PROMPTS } from "../ai/prompts/promptRegistry.ts";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("system prompt exposes the canonical master foundation", () => {
  assert.match(SYSTEM_PROMPT, /You are Forge, a production-grade AI assistant/);
  assert.match(SYSTEM_PROMPT, /GLOBAL BEHAVIOR/);
  assert.match(SYSTEM_PROMPT, /COMMUNICATION PHILOSOPHY/);
  assert.match(SYSTEM_PROMPT, /PRECEDENCE/);
  assert.equal(PROMPTS.system, SYSTEM_PROMPT);
});

test("layered prompts remain available at top level", () => {
  assert.ok(PROMPTS.safety.trim().length > 0);
  assert.ok(PROMPTS.formatter.trim().length > 0);
  assert.ok(PROMPTS.classifier.trim().length > 0);
  assert.ok(PROMPTS.coding.trim().length > 0);
  assert.ok(PROMPTS.reasoning.trim().length > 0);
  assert.ok(PROMPTS.planning.trim().length > 0);
  assert.match(PROMPTS.formatter, /OUTPUT DISCIPLINE/);
  assert.match(PROMPTS.formatter, /No filler, preambles/);
  assert.match(PROMPTS.formatter, /No malformed tokens/);
  assert.match(PROMPTS.formatter, /RESPONSE MODE MAPPING/);
  assert.match(PROMPTS.formatter, /one command per line/);
  assert.match(PROMPTS.formatter, /Keep commands copy-paste safe/);
  assert.match(PROMPTS.safety, /SAFETY BOUNDARY/);
  assert.match(PROMPTS.safety, /TRUTHFULNESS/);
});

test("intent classifier prompt contract emits structured routing JSON", () => {
  const message = buildIntentClassificationMessage(
    "Help me write a React component",
  );

  assert.match(message, /You are a strict intent router for Forge\./);
  assert.match(message, /Return JSON ONLY in this exact shape:/);
  assert.match(message, /"intent":"\.\.\."/);
  assert.match(message, /"difficulty":"\.\.\."/);
  assert.match(message, /"tool_usage":\["\.\.\."\]/);
  assert.match(message, /"multi_intent":\["\.\.\."\]/);
  assert.match(message, /User message: "Help me write a React component"/);
});

test("freshness classifier prompt contract enforces exact JSON shape", () => {
  const message = buildFreshnessFromIntent("Bitcoin price right now");

  assert.match(
    message,
    /\{"intent":"factual\|reasoning\|code\|creative","requiresFreshData":true\|false,"confidence":"high\|medium\|low"\}/,
  );
  assert.match(
    message,
    /Do not include explanations, markdown, or extra keys\./,
  );
  assert.match(message, /User message: "Bitcoin price right now"/);
});

test("intent prompt keeps low-token structured routing scope", () => {
  const message = buildIntentClassificationMessage("Explain hooks simply");

  assert.match(message, /difficulty/);
  assert.match(message, /verbosity/);
  assert.match(message, /audience_level/);
  assert.match(message, /response_mode/);
  assert.match(message, /memory_relevance/);
});

test("router keeps backward-compatible freshness export contract", () => {
  const source = readWorkspaceFile("ai/prompts/router.ts");

  assert.match(
    source,
    /import\s+\{\s*buildFreshnessClassificationMessage\s*\}\s+from\s+"@\/ai\/prompts\/intent";/,
  );
  assert.match(
    source,
    /export\s+\{\s*buildFreshnessClassificationMessage\s*\};/,
  );
});

test("teaching prompt exports centralized principles and readability rules", () => {
  const source = readWorkspaceFile("ai/prompts/teaching.prompt.ts");

  assert.match(source, /TEACHING_PRINCIPLES/);
  assert.match(source, /READABILITY_RULES/);
  assert.match(source, /PROGRESSIVE DISCLOSURE/);
  assert.match(source, /DEPTH MODES/);
  assert.match(source, /MINIMAL mode/);
  assert.match(source, /STANDARD mode/);
  assert.match(source, /DEEP mode/);
  assert.match(source, /getTeachingInstructionsForDepth/);
  assert.match(source, /getReadabilityFormatting/);
});

test("system prompt incorporates teaching principles", () => {
  assert.match(SYSTEM_PROMPT, /TEACHING EXCELLENCE/);
  assert.match(SYSTEM_PROMPT, /PROGRESSIVE DISCLOSURE/);
  assert.match(SYSTEM_PROMPT, /READABILITY OPTIMIZATION/);
  assert.match(SYSTEM_PROMPT, /DEPTH MODES/);
});

test("formatter prompt includes progressive disclosure and teaching guidance", () => {
  const source = readWorkspaceFile("ai/prompts/formatter.prompt.ts");

  assert.match(
    source,
    /teach.*Educational response prioritizing progressive disclosure/,
  );
  assert.match(source, /PROGRESSIVE DISCLOSURE/);
  assert.match(source, /Further detail →/);
  assert.match(source, /ADVANCED:/);
  assert.match(source, /WHY THIS MATTERS/);
});

test("mode prompt maps teaching depth to instruction sets", () => {
  const source = readWorkspaceFile("ai/prompts/mode.prompt.ts");

  assert.match(source, /getTeachingInstructionsForDepth/);
  assert.match(source, /Teaching depth: \${controls\.teachingDepth}/);
});

test("router includes improved auto-detection for teaching depth", () => {
  const source = readWorkspaceFile("ai/prompts/router.ts");

  // Check for keyword-based depth detection
  assert.match(source, /explain|why|how|walk me through|teach me|break down/);
  assert.match(source, /just answer|no explanation|brief|tl/);

  // Check for audience-to-depth mapping
  assert.match(source, /inferredAudience === "beginner"/);
  assert.match(source, /inferredAudience === "expert"/);

  // Check for telemetry logging
  assert.match(source, /logTeachingDepthTelemetry/);
  assert.match(source, /topic_hash/);
  assert.match(source, /chosen_depth/);
  assert.match(source, /inferred_audience/);
});

test("classifier prompt recognizes explanation as a teaching category", () => {
  const source = readWorkspaceFile("ai/prompts/classifier.prompt.ts");

  assert.match(source, /explanation/);
  assert.match(source, /teaching, conceptual breakdowns, comparisons/);
});
