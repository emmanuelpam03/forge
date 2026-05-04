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

  it("should remove outline pseudo-headings even after answer starts", async () => {
    const { sanitizeAssistantOutput } = await loadSanitizer();

    const input = [
      "Nigeria is a federal republic with a complex power-sharing structure.",
      "- Drivers: oil revenue, regional patronage networks, and party competition.",
      "**Implications:** policy swings and uneven service delivery.",
      "Heading 1: The Shift in Global Power (Discuss the UN, decolonization).",
      "Paragraph 2: The roots of the conflict lay in unresolved tensions.",
      "Closing: It reshaped the modern world.",
      "### What changes in practice",
      "Elections often determine who controls state-level budgets.",
    ].join("\n");

    const output = sanitizeAssistantOutput(input);

    assert.ok(output.includes("Nigeria is a federal republic"));
    assert.ok(!output.includes("Drivers:"));
    assert.ok(!output.toLowerCase().includes("implications"));
    assert.ok(!output.includes("Heading 1:"));
    assert.ok(!output.includes("Paragraph 2:"));
    assert.ok(!output.includes("Closing:"));
    assert.ok(output.includes("### What changes in practice"));
    assert.ok(output.includes("Elections often determine"));
  });

  it("should drop outline labels in streaming chunks after answer started", async () => {
    const { sanitizeAssistantOutputChunk } = await loadSanitizer();

    const state = {
      insideCodeFence: false,
      startedVisibleAnswer: false,
      lineBuffer: "",
    };

    const first = sanitizeAssistantOutputChunk(
      "Nigeria is a federal republic with overlapping authorities.\n",
      state,
    );
    assert.ok(first.text.includes("Nigeria is a federal republic"));

    const second = sanitizeAssistantOutputChunk("- Drivers: oil and patronage.\n", state);
    assert.strictEqual(second.text, "");

    const third = sanitizeAssistantOutputChunk("That creates incentives for rent-seeking.\n", state);
    assert.ok(third.text.includes("That creates incentives"));
  });

  it("should suppress outline labels split across chunk boundaries", async () => {
    const { sanitizeAssistantOutputChunk } = await loadSanitizer();

    const state = {
      insideCodeFence: false,
      startedVisibleAnswer: false,
      lineBuffer: "",
    };

    // Start answer
    const first = sanitizeAssistantOutputChunk(
      "Nigeria is a federal republic with overlapping authorities.\n",
      state,
    );
    assert.ok(first.text.includes("Nigeria is a federal republic"));

    // Label split across chunks: "Heading " + "1: ..."
    const second = sanitizeAssistantOutputChunk("Heading ", state);
    assert.strictEqual(second.text, "");

    const third = sanitizeAssistantOutputChunk("1: The New World Order\n", state);
    assert.strictEqual(third.text, "");

    const fourth = sanitizeAssistantOutputChunk(
      "That shift changed diplomatic institutions.\n",
      state,
    );
    assert.ok(fourth.text.includes("That shift changed"));
  });

  it("should sanitize streaming chunks without leaking fenced blocks", async () => {
    const { sanitizeAssistantOutputChunk } = await loadSanitizer();

    const state = {
      insideCodeFence: false,
      startedVisibleAnswer: false,
      lineBuffer: "",
    };
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
