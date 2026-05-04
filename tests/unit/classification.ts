/**
 * Unit tests for classification logic.
 * Tests the decision-making for tool forcing based on classification.
 */

// Pure logic implementations (mirrored from ai/graph/classification.ts)
function normalizeClassificationIntent(
  value: string | undefined | null,
): "factual" | "reasoning" | "code" | "creative" {
  if (value === "reasoning" || value === "code" || value === "creative") {
    return value;
  }
  return "factual";
}

function normalizeClassificationConfidence(
  value: string | undefined | null,
): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "low";
}

function parseClassificationText(text: string) {
  try {
    const parsed = JSON.parse(text) as {
      intent?: string;
      requiresFreshData?: boolean;
      confidence?: string;
    };

    return {
      intent: normalizeClassificationIntent(parsed.intent),
      requiresFreshData: parsed.requiresFreshData === true,
      confidence: normalizeClassificationConfidence(parsed.confidence),
    };
  } catch {
    return {
      intent: "factual",
      requiresFreshData: false,
      confidence: "low",
    };
  }
}

function shouldForceWebSearchFromClassification(
  classification:
    | {
        intent: "factual" | "reasoning" | "code" | "creative";
        requiresFreshData: boolean;
        confidence: "high" | "medium" | "low";
      }
    | null
    | undefined,
): boolean {
  if (!classification) {
    return false;
  }

  return (
    classification.intent === "factual" &&
    (classification.requiresFreshData || classification.confidence !== "high")
  );
}

import { describe, it } from "node:test";
import assert from "node:assert";

describe("Classification Unit Tests", () => {
  describe("normalizeClassificationIntent", () => {
    it("should accept valid intents", () => {
      assert.strictEqual(normalizeClassificationIntent("factual"), "factual");
      assert.strictEqual(
        normalizeClassificationIntent("reasoning"),
        "reasoning",
      );
      assert.strictEqual(normalizeClassificationIntent("code"), "code");
      assert.strictEqual(normalizeClassificationIntent("creative"), "creative");
    });

    it("should default invalid intents to factual", () => {
      assert.strictEqual(normalizeClassificationIntent("invalid"), "factual");
      assert.strictEqual(normalizeClassificationIntent(undefined), "factual");
      assert.strictEqual(normalizeClassificationIntent(null), "factual");
      assert.strictEqual(normalizeClassificationIntent(""), "factual");
    });
  });

  describe("normalizeClassificationConfidence", () => {
    it("should accept valid confidence levels", () => {
      assert.strictEqual(normalizeClassificationConfidence("high"), "high");
      assert.strictEqual(normalizeClassificationConfidence("medium"), "medium");
      assert.strictEqual(normalizeClassificationConfidence("low"), "low");
    });

    it("should default invalid confidence to low", () => {
      assert.strictEqual(normalizeClassificationConfidence("invalid"), "low");
      assert.strictEqual(normalizeClassificationConfidence(undefined), "low");
      assert.strictEqual(normalizeClassificationConfidence(null), "low");
      assert.strictEqual(normalizeClassificationConfidence(""), "low");
    });
  });

  describe("parseClassificationText", () => {
    it("should parse valid JSON classification", () => {
      const input = JSON.stringify({
        intent: "factual",
        requiresFreshData: true,
        confidence: "high",
      });

      const result = parseClassificationText(input);

      assert.strictEqual(result.intent, "factual");
      assert.strictEqual(result.requiresFreshData, true);
      assert.strictEqual(result.confidence, "high");
    });

    it("should normalize parsed values", () => {
      const input = JSON.stringify({
        intent: "invalid_intent",
        requiresFreshData: false,
        confidence: "invalid_confidence",
      });

      const result = parseClassificationText(input);

      assert.strictEqual(result.intent, "factual");
      assert.strictEqual(result.requiresFreshData, false);
      assert.strictEqual(result.confidence, "low");
    });

    it("should handle invalid JSON gracefully", () => {
      const result = parseClassificationText("not valid json");

      assert.deepStrictEqual(result, {
        intent: "factual",
        requiresFreshData: false,
        confidence: "low",
      });
    });

    it("should handle empty string", () => {
      const result = parseClassificationText("");

      assert.deepStrictEqual(result, {
        intent: "factual",
        requiresFreshData: false,
        confidence: "low",
      });
    });

    it("should handle partial JSON object", () => {
      const input = JSON.stringify({
        intent: "reasoning",
        // missing requiresFreshData
        confidence: "medium",
      });

      const result = parseClassificationText(input);

      assert.strictEqual(result.intent, "reasoning");
      assert.strictEqual(result.requiresFreshData, false);
      assert.strictEqual(result.confidence, "medium");
    });

    it("should convert non-boolean requiresFreshData", () => {
      const input = JSON.stringify({
        intent: "factual",
        requiresFreshData: "yes", // not a boolean
        confidence: "high",
      });

      const result = parseClassificationText(input);

      assert.strictEqual(result.requiresFreshData, false);
    });
  });

  describe("shouldForceWebSearchFromClassification", () => {
    it("should return false for null or undefined", () => {
      assert.strictEqual(shouldForceWebSearchFromClassification(null), false);
      assert.strictEqual(
        shouldForceWebSearchFromClassification(undefined),
        false,
      );
    });

    it("should return true when factual + requiresFreshData", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: true,
        confidence: "low" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(classification),
        true,
      );
    });

    it("should return true when factual + low confidence", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: false,
        confidence: "low" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(classification),
        true,
      );
    });

    it("should return true when factual + medium confidence", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: false,
        confidence: "medium" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(classification),
        true,
      );
    });

    it("should return false when factual + high confidence + no fresh data", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: false,
        confidence: "high" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(classification),
        false,
      );
    });

    it("should return false when non-factual", () => {
      const reasoningClassification = {
        intent: "reasoning" as const,
        requiresFreshData: true,
        confidence: "low" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(reasoningClassification),
        false,
      );

      const codeClassification = {
        intent: "code" as const,
        requiresFreshData: true,
        confidence: "low" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(codeClassification),
        false,
      );
    });

    it("should force web search when factual + both conditions", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: true,
        confidence: "high" as const,
      };

      assert.strictEqual(
        shouldForceWebSearchFromClassification(classification),
        true,
      );
    });
  });

  describe("Query intent routing", () => {
    const classifyQueryIntent = (query: string) => {
      const normalized = query.trim().replace(/\s+/g, " ").toLowerCase();

      const realTime =
        /\b(latest|current|today|currently|right now|live|breaking|news|price|prices|stock|stocks|rank|ranking|rankings|score|scores)\b/i.test(
          normalized,
        );
      const calculation =
        /\b(calculate|compute|solve|evaluate|figure out)\b/i.test(normalized) ||
        (/\d/.test(normalized) && /[=+\-*/%]/.test(normalized));
      const taskable =
        /\b(track|monitor|remind(?: me)?|notify me|alert me|follow up|follow-up|schedule|check in|keep an eye on)\b/i.test(
          normalized,
        );

      if (!normalized) return { needsTools: false, type: "knowledge" as const };
      if (calculation)
        return { needsTools: true, type: "calculation" as const };
      if (taskable) return { needsTools: false, type: "taskable" as const };
      if (realTime) return { needsTools: true, type: "real_time" as const };
      if (/\b(search|lookup|find|research|verify|check)\b/i.test(normalized)) {
        return { needsTools: true, type: "knowledge" as const };
      }
      return { needsTools: false, type: "knowledge" as const };
    };

    it("should skip tools for conceptual questions", () => {
      assert.deepStrictEqual(classifyQueryIntent("what is racism"), {
        needsTools: false,
        type: "knowledge",
      });
    });

    it("should require tools for live price queries", () => {
      assert.deepStrictEqual(classifyQueryIntent("latest bitcoin price"), {
        needsTools: true,
        type: "real_time",
      });
    });

    it("should require tools for calculations", () => {
      assert.deepStrictEqual(classifyQueryIntent("calculate 5% of 2000"), {
        needsTools: true,
        type: "calculation",
      });
    });

    it("should classify taskable requests without tools", () => {
      assert.deepStrictEqual(classifyQueryIntent("track bitcoin price"), {
        needsTools: false,
        type: "taskable",
      });
    });
  });
});
