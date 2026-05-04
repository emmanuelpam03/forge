import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  AI_BACKEND_POLICY,
  BEHAVIOR_LAYER,
  CHAT_SYSTEM_PROMPT,
  CORE_LAYER,
  EXECUTION_POLICY,
  EXTENSIONS_LAYER,
  OUTPUT_CONTROL_LAYER,
  ROUTING_LAYER,
  SUMMARIZATION_POLICY,
  SYSTEM_PROMPT,
  TOOLS_POLICY,
  WRITING_POLICY,
} from "../ai/prompts/system.ts";
import {
  buildFreshnessClassificationMessage as buildFreshnessFromIntent,
  buildIntentClassificationMessage,
} from "../ai/prompts/intent.ts";
import { buildTopicTemplateLayer } from "../ai/prompts/templates.ts";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("system prompt composes all required layers in order", () => {
  const expected = [
    CORE_LAYER,
    OUTPUT_CONTROL_LAYER,
    BEHAVIOR_LAYER,
    ROUTING_LAYER,
    EXTENSIONS_LAYER,
  ].join("\n\n");

  assert.equal(CHAT_SYSTEM_PROMPT, expected);
  assert.equal(SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT);

  const coreIndex = CHAT_SYSTEM_PROMPT.indexOf("## Core");
  const outputControlIndex = CHAT_SYSTEM_PROMPT.indexOf("## Output Control");
  const behaviorIndex = CHAT_SYSTEM_PROMPT.indexOf("## Behavior");
  const routingIndex = CHAT_SYSTEM_PROMPT.indexOf("## Routing");
  const extensionsIndex = CHAT_SYSTEM_PROMPT.indexOf("## Extensions");

  assert.ok(coreIndex >= 0);
  assert.ok(outputControlIndex > coreIndex);
  assert.ok(behaviorIndex > outputControlIndex);
  assert.ok(routingIndex > behaviorIndex);
  assert.ok(extensionsIndex > routingIndex);
  assert.match(CORE_LAYER, /You are the senior engineer for Forge\./);
});

test("extensions layer includes execution, writing, tools, and ai backend policies", () => {
  assert.match(EXTENSIONS_LAYER, /Execution:/);
  assert.match(EXTENSIONS_LAYER, /Writing:/);
  assert.match(EXTENSIONS_LAYER, /Tools:/);
  assert.match(EXTENSIONS_LAYER, /AI backend ownership:/);

  assert.ok(EXTENSIONS_LAYER.includes(EXECUTION_POLICY.trim()));
  assert.ok(EXTENSIONS_LAYER.includes(WRITING_POLICY.trim()));
  assert.ok(EXTENSIONS_LAYER.includes(SUMMARIZATION_POLICY.trim()));
  assert.ok(EXTENSIONS_LAYER.includes(TOOLS_POLICY.trim()));
  assert.ok(EXTENSIONS_LAYER.includes(AI_BACKEND_POLICY.trim()));
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

test("legacy writing and summarization modules re-export canonical policies", () => {
  const writingSource = readWorkspaceFile("ai/prompts/writing.ts");
  const summarizationSource = readWorkspaceFile("ai/prompts/summarization.ts");

  assert.match(
    writingSource,
    /export\s+\{\s*WRITING_POLICY\s*\}\s+from\s+"@\/ai\/prompts\/system";/,
  );
  assert.match(
    summarizationSource,
    /export\s+\{\s*SUMMARIZATION_POLICY\s*\}\s+from\s+"@\/ai\/prompts\/system";/,
  );

  assert.ok(WRITING_POLICY.trim().length > 0);
  assert.ok(SUMMARIZATION_POLICY.trim().length > 0);
});

test("topic template layer resolves by classified intent", () => {
  const codeLayer = buildTopicTemplateLayer("code");
  const factualLayer = buildTopicTemplateLayer("factual");

  assert.match(codeLayer, /Topic Template: Code/);
  assert.match(factualLayer, /Topic Template: Factual/);
  assert.equal(buildTopicTemplateLayer(null), "");
});
