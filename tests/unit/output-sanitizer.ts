import { describe, it } from "node:test";
import assert from "node:assert";

async function loadSanitizer() {
  return import(
    new URL("../../ai/graph/output-sanitizer.ts", import.meta.url).href
  );
}

describe("Output sanitizer", () => {
  it("should strip prompt-template labels from contaminated output", async () => {
    const { sanitizeAssistantOutput } = await loadSanitizer();

    const input = [
      "Politics in Nigeria. High-performance AI (Forge). Direct, high-signal, clear structure, factual, specific. No fluff, no planning steps, no instruction labels.",
      "Structure:",
      "- Introduction",
      "Politics in Nigeria involves federal power, regional tensions, and electoral competition.",
      "```text",
      "TEXT",
      "Copy",
      "* System: Federal Presidential Republic.",
      "```",
      "System: internal note",
      "Avoid: template output",
      "Specificity check: add context",
      "Refine: not for users",
    ].join("\n");

    const output = sanitizeAssistantOutput(input);

    assert.ok(output.includes("Politics in Nigeria involves federal power"));
    assert.ok(!output.includes("High-performance AI"));
    assert.ok(!output.includes("Structure:"));
    assert.ok(!output.includes("System:"));
    assert.ok(!output.includes("Avoid:"));
    assert.ok(!output.includes("Specificity"));
    assert.ok(!output.includes("Refine:"));
    assert.ok(!output.includes("TEXT"));
    assert.ok(!output.includes("Copy"));
  });

  it("should sanitize streaming chunks without leaking fenced blocks", async () => {
    const { sanitizeAssistantOutputChunk } = await loadSanitizer();

    const state = { insideCodeFence: false, startedVisibleAnswer: false };
    const first = sanitizeAssistantOutputChunk(
      "Politics in Nigeria. High-performance AI (Forge).\n",
      state,
    );

    assert.ok(!first.text.includes("High-performance AI"));
    assert.strictEqual(first.text, "");

    const second = sanitizeAssistantOutputChunk(
      "```\nTEXT\nCopy\n```\nNigeria is a federal republic.\n",
      state,
    );

    assert.ok(!second.text.includes("TEXT"));
    assert.ok(!second.text.includes("Copy"));
    assert.ok(second.text.includes("Nigeria is a federal republic."));
  });
});
