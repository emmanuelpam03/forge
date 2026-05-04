import { describe, it } from "node:test";
import assert from "node:assert";
import { isAnswerStart } from "../../ai/graph/reasoning-split.ts";

describe("Reasoning split heuristic", () => {
  it("should identify a normal answer start", () => {
    assert.strictEqual(isAnswerStart("The answer is 42."), true);
  });

  it("should allow leading whitespace before the answer", () => {
    assert.strictEqual(isAnswerStart("  Answer starts here."), true);
  });

  it("should reject instruction-like reasoning text", () => {
    assert.strictEqual(isAnswerStart("user might want to refine this"), false);
    assert.strictEqual(isAnswerStart("* bullet point"), false);
  });
});
