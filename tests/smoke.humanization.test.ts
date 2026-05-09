import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { shouldUseHumanizationMode } from "../ai/prompts/humanization.prompt.ts";
import { sanitizeAssistantOutput } from "../ai/graph/output-sanitizer.ts";

test("smoke: humanization prompt included only on explicit requests", () => {
  const explicit =
    "Please humanize this: Make it sound more natural and less robotic.";
  const normal = "Refactor this TypeScript function to use early returns.";

  const explicitEnabled = shouldUseHumanizationMode(explicit);
  const normalEnabled = shouldUseHumanizationMode(normal);

  // Ensure trigger detection works
  assert.equal(explicitEnabled, true);
  assert.equal(normalEnabled, false);

  // Check prompt source file exists and includes key marker
  const humanizationMd = readFileSync(
    join(process.cwd(), "ai/prompts/humanization_prompt.md"),
    "utf8",
  );
  assert.ok(humanizationMd.includes("ANTI-ROBOTIC RULES"));
});

test("smoke: sanitizer cleans up drafting artifacts when humanize is used", () => {
  const raw = `\n*Check: Drafting notes\n\nThis is the actual answer.\n\nNo fragments\n`;
  const cleaned = sanitizeAssistantOutput(raw);

  assert.ok(!cleaned.includes("Check:"));
  assert.ok(cleaned.includes("This is the actual answer."));
});
