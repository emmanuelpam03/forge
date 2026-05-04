import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeAssistantOutput } from "../../ai/graph/output-sanitizer.ts";

describe("Output sanitizer", () => {
  it("should strip prompt-template labels from contaminated output", () => {
    const input = [
      "Structure:",
      "- Introduction",
      "Politics in Nigeria involves federal power, regional tensions, and electoral competition.",
      "System: internal note",
      "Avoid: template output",
      "Specificity check: add context",
      "Refine: not for users",
    ].join("\n");

    const output = sanitizeAssistantOutput(input);

    assert.ok(output.includes("Politics in Nigeria involves federal power"));
    assert.ok(!output.includes("Structure:"));
    assert.ok(!output.includes("System:"));
    assert.ok(!output.includes("Avoid:"));
    assert.ok(!output.includes("Specificity"));
    assert.ok(!output.includes("Refine:"));
  });
});
