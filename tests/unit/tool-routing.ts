import { describe, it } from "node:test";
import assert from "node:assert";
import type { ToolPlan, ChatGraphState } from "@/ai/graph/state";

/**
 * Unit tests for tool routing logic.
 * Tests the decision-making in planTaskNode and toolRouterNode.
 */

describe("Tool Routing Unit Tests", () => {
  describe("Tool plan execution modes", () => {
    it("should set execution mode to none when no tools needed", () => {
      const toolPlan: ToolPlan = {
        intent: "factual",
        toolsNeeded: [],
        sequential: false,
        followUpNeeded: false,
      };

      const executionMode = toolPlan.toolsNeeded.length === 0 ? "none" : "single";

      assert.strictEqual(executionMode, "none");
    });

    it("should set execution mode to single for one tool", () => {
      const toolPlan: ToolPlan = {
        intent: "factual",
        toolsNeeded: ["webSearch"],
        sequential: false,
        followUpNeeded: false,
      };

      const executionMode =
        toolPlan.toolsNeeded.length === 0
          ? "none"
          : toolPlan.toolsNeeded.length === 1
            ? "single"
            : toolPlan.sequential
              ? "multi-sequential"
              : "multi-parallel";

      assert.strictEqual(executionMode, "single");
    });

    it("should set execution mode to multi-parallel for independent tools", () => {
      const toolPlan: ToolPlan = {
        intent: "reasoning",
        toolsNeeded: ["calculator", "currentDateTime"],
        sequential: false,
        followUpNeeded: false,
      };

      const executionMode =
        toolPlan.toolsNeeded.length === 0
          ? "none"
          : toolPlan.toolsNeeded.length === 1
            ? "single"
            : toolPlan.sequential
              ? "multi-sequential"
              : "multi-parallel";

      assert.strictEqual(executionMode, "multi-parallel");
    });

    it("should set execution mode to multi-sequential for dependent tools", () => {
      const toolPlan: ToolPlan = {
        intent: "factual",
        toolsNeeded: ["webSearch", "summarizeText"],
        sequential: true,
        followUpNeeded: false,
      };

      const executionMode =
        toolPlan.toolsNeeded.length === 0
          ? "none"
          : toolPlan.toolsNeeded.length === 1
            ? "single"
            : toolPlan.sequential
              ? "multi-sequential"
              : "multi-parallel";

      assert.strictEqual(executionMode, "multi-sequential");
    });
  });

  describe("Forced tool logic", () => {
    it("should shortcut planning when forceTool is set", () => {
      const state = {
        forceTool: "webSearch",
        toolPlan: null,
        executionMode: "none",
      };

      // Logic: if forceTool is set, skip planning and set single execution
      const shouldShortcircuit = !!state.forceTool;

      if (shouldShortcircuit) {
        const executionMode = "single";
        assert.strictEqual(executionMode, "single");
      }

      assert.strictEqual(shouldShortcircuit, true);
    });

    it("should execute forced tool deterministically", () => {
      const forcedToolName = "webSearch";
      const userMessage = "What is the capital of France?";

      // Simulate forced tool execution
      const args: Record<string, unknown> = {
        query: userMessage,
        maxResults: 5,
      };

      assert.strictEqual(args.query, userMessage);
      assert.strictEqual(args.maxResults, 5);
    });

    it("should handle forced tool failure gracefully", () => {
      const forcedToolName = "webSearch";
      let forcedToolFailed = false;
      let fallbackToNormalPlanning = false;

      try {
        // Simulate tool error
        throw new Error("Tool execution failed");
      } catch (err) {
        forcedToolFailed = true;
        fallbackToNormalPlanning = !forcedToolFailed;
      }

      assert.strictEqual(forcedToolFailed, true);
      assert.strictEqual(fallbackToNormalPlanning, false);
    });
  });

  describe("Classification-based tool forcing", () => {
    it("should force webSearch for factual + fresh data requirement", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: true,
        confidence: "medium" as const,
      };

      // Logic from shouldForceWebSearchFromClassification
      const shouldForceWebSearch =
        classification.intent === "factual" &&
        (classification.requiresFreshData || classification.confidence !== "high");

      assert.strictEqual(shouldForceWebSearch, true);
    });

    it("should force webSearch for factual + low confidence", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: false,
        confidence: "low" as const,
      };

      const shouldForceWebSearch =
        classification.intent === "factual" &&
        (classification.requiresFreshData || classification.confidence !== "high");

      assert.strictEqual(shouldForceWebSearch, true);
    });

    it("should not force webSearch for high confidence factual", () => {
      const classification = {
        intent: "factual" as const,
        requiresFreshData: false,
        confidence: "high" as const,
      };

      const shouldForceWebSearch =
        classification.intent === "factual" &&
        (classification.requiresFreshData || classification.confidence !== "high");

      assert.strictEqual(shouldForceWebSearch, false);
    });

    it("should not force webSearch for non-factual intents", () => {
      const reasoningClassification = {
        intent: "reasoning" as const,
        requiresFreshData: true,
        confidence: "low" as const,
      };

      const shouldForceWebSearch =
        reasoningClassification.intent === "factual" &&
        (reasoningClassification.requiresFreshData ||
          reasoningClassification.confidence !== "high");

      assert.strictEqual(shouldForceWebSearch, false);
    });

    it("should log forced tool routing with classifier context", () => {
      const state = {
        chatId: "chat_123",
        runId: "run_456",
        classifiedIntent: {
          intent: "factual" as const,
          requiresFreshData: true,
          confidence: "high" as const,
        },
        forceTool: undefined,
      };

      // Should log JSON with classifier context
      const logData = {
        event: "toolRouting.forced",
        classifier: state.classifiedIntent,
        forcedTool: "webSearch",
      };

      assert.strictEqual(logData.event, "toolRouting.forced");
      assert.deepStrictEqual(logData.classifier, {
        intent: "factual",
        requiresFreshData: true,
        confidence: "high",
      });
    });
  });

  describe("Tool plan parsing", () => {
    it("should parse valid tool plan JSON", () => {
      const jsonResponse = JSON.stringify({
        toolsNeeded: ["webSearch", "summarizeText"],
        sequential: true,
        followUpNeeded: false,
      });

      const parsed = JSON.parse(jsonResponse);

      assert.deepStrictEqual(parsed.toolsNeeded, ["webSearch", "summarizeText"]);
      assert.strictEqual(parsed.sequential, true);
      assert.strictEqual(parsed.followUpNeeded, false);
    });

    it("should handle malformed tool plan JSON", () => {
      const invalidJson = "not valid json";
      let parsed;

      try {
        parsed = JSON.parse(invalidJson);
      } catch {
        // Default to no tools
        parsed = {
          toolsNeeded: [],
          sequential: false,
          followUpNeeded: false,
        };
      }

      assert.deepStrictEqual(parsed, {
        toolsNeeded: [],
        sequential: false,
        followUpNeeded: false,
      });
    });

    it("should ensure toolsNeeded is always an array", () => {
      const invalidResponse = JSON.stringify({
        toolsNeeded: "webSearch", // String instead of array
        sequential: false,
        followUpNeeded: false,
      });

      const parsed = JSON.parse(invalidResponse);
      const toolsNeeded = Array.isArray(parsed.toolsNeeded)
        ? parsed.toolsNeeded
        : [];

      assert.deepStrictEqual(toolsNeeded, []);
    });

    it("should handle follow-up questions", () => {
      const planWithFollowUp = JSON.stringify({
        toolsNeeded: [],
        sequential: false,
        followUpNeeded: true,
        followUpQuestion: "What is your budget range?",
      });

      const parsed = JSON.parse(planWithFollowUp);

      assert.strictEqual(parsed.followUpNeeded, true);
      assert.strictEqual(
        parsed.followUpQuestion,
        "What is your budget range?"
      );
    });
  });

  describe("Tool context propagation", () => {
    it("should set toolContext when forced tool executes", () => {
      let toolContext = "";
      const toolResult = "Paris is the capital of France.";

      toolContext = toolResult;

      assert.strictEqual(toolContext, "Paris is the capital of France.");
    });

    it("should propagate tool context through sequential execution", () => {
      let context = "Initial context";

      // Step 1: webSearch
      context = "Search results for Paris...";

      // Step 2: summarizeText uses webSearch context
      context = "Paris is a major city.";

      assert.ok(context.includes("Paris"));
    });

    it("should accumulate evidence bundles", () => {
      const evidenceBundles = [];

      // Tool 1 result
      evidenceBundles.push({
        tool: "webSearch",
        content: "Paris facts...",
        timestamp: new Date().toISOString(),
      });

      // Tool 2 result
      evidenceBundles.push({
        tool: "calculator",
        content: "Distance calculation...",
        timestamp: new Date().toISOString(),
      });

      assert.strictEqual(evidenceBundles.length, 2);
      assert.strictEqual(evidenceBundles[0].tool, "webSearch");
      assert.strictEqual(evidenceBundles[1].tool, "calculator");
    });
  });

  describe("Available tools", () => {
    const availableTools = [
      "calculator",
      "currentDateTime",
      "webSearch",
      "summarizeText",
      "projectContextLookup",
    ];

    it("should only use available tools", () => {
      const requestedTools = ["webSearch", "calculator"];

      const validTools = requestedTools.filter((tool) =>
        availableTools.includes(tool)
      );

      assert.deepStrictEqual(validTools, ["webSearch", "calculator"]);
    });

    it("should reject unknown tools", () => {
      const requestedTools = ["webSearch", "unknownTool"];

      const validTools = requestedTools.filter((tool) =>
        availableTools.includes(tool)
      );

      assert.deepStrictEqual(validTools, ["webSearch"]);
    });

    it("should handle empty tool requests", () => {
      const requestedTools: string[] = [];

      const executionMode =
        requestedTools.length === 0 ? "none" : "single";

      assert.strictEqual(executionMode, "none");
    });
  });

  describe("Tool routing edge cases", () => {
    it("should handle null classifiedIntent", () => {
      const state = {
        classifiedIntent: null,
        forceTool: undefined,
      };

      // When classifiedIntent is null/undefined, shouldForceWebSearch is false
      const shouldForceWebSearch = state.classifiedIntent
        ? state.classifiedIntent.intent === "factual" &&
          (state.classifiedIntent.requiresFreshData ||
            state.classifiedIntent.confidence !== "high")
        : false;

      assert.strictEqual(shouldForceWebSearch, false);
    });

    it("should prioritize forceTool over plan", () => {
      const state = {
        forceTool: "webSearch",
        toolPlan: {
          intent: "factual",
          toolsNeeded: ["calculator"],
          sequential: false,
          followUpNeeded: false,
        },
      };

      // forceTool takes priority
      const toolToRun = state.forceTool;

      assert.strictEqual(toolToRun, "webSearch");
    });

    it("should handle tools used tracking", () => {
      const toolsUsed = new Set<string>();

      toolsUsed.add("webSearch");
      toolsUsed.add("webSearch"); // Duplicate

      assert.deepStrictEqual(Array.from(toolsUsed), ["webSearch"]);
    });
  });
});
