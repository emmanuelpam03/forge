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

test("system prompt exposes the canonical v2 identity and constraints", () => {
  assert.match(
    SYSTEM_PROMPT,
    /high-capability, production-grade AI agent for Forge/,
  );
  assert.match(SYSTEM_PROMPT, /INTELLIGENCE STANDARD/);
  assert.match(SYSTEM_PROMPT, /OUTPUT DISCIPLINE/);
  assert.equal(PROMPTS.system, SYSTEM_PROMPT);
});

test("formatter and specialist prompts remain available at top level", () => {
  assert.ok(PROMPTS.formatter.trim().length > 0);
  assert.ok(PROMPTS.classifier.trim().length > 0);
  assert.ok(PROMPTS.coding.trim().length > 0);
  assert.ok(PROMPTS.reasoning.trim().length > 0);
  assert.ok(PROMPTS.planning.trim().length > 0);
  // Formatter should enforce OUTPUT DISCIPLINE, not just describe it
  assert.match(PROMPTS.formatter, /OUTPUT DISCIPLINE/);
  assert.match(PROMPTS.formatter, /No filler, preambles/);
  assert.match(PROMPTS.formatter, /No malformed tokens/);
  assert.match(PROMPTS.formatter, /No vague hedging/);
  // Should guide on response modes and code blocks
  assert.match(PROMPTS.formatter, /RESPONSE MODE MAPPING/);
  assert.match(PROMPTS.formatter, /one command per line/);
  assert.match(PROMPTS.formatter, /Keep commands copy-paste safe/);
});

test("intent classifier prompt contract remains strict and token-only", () => {
  const message = buildIntentClassificationMessage(
    "Help me write a React component",
  );

  assert.match(
    message,
    /Classify the user's message into exactly ONE category:/,
  );
  assert.match(message, /Return ONLY the lowercase category token\./);
  assert.match(message, /If uncertain, return "chat"\./);
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
