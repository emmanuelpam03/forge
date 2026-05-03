import { describe, it } from "node:test";
import assert from "node:assert";

type TaskSuggestion = {
  id: string;
  type: "suggestion";
  action: string;
  description: string;
  taskType: "scheduled" | "conditional" | "one-time";
  scheduleSpec?: string | null;
  conditionText?: string | null;
  oneTimeAt?: string | null;
};

function parseJsonFromModelText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with tolerant extraction below.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // Continue with object-slice extraction below.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSlice);
    } catch {
      return null;
    }
  }

  return null;
}

function cleanFallbackAssistantText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(
      /^\s*(?:reasoning|planning|analysis|thoughts?|constraint check|refining|internal instructions?)\s*:\s*.*$/gim,
      "",
    )
    .replace(/^\s*(?:system|assistant|user)\s*:\s*/gim, "")
    .replace(/^\s*[-*>#]+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildTaskSuggestion(
  candidate: Partial<TaskSuggestion> & { type?: string; taskType?: string },
): TaskSuggestion | null {
  if (
    typeof candidate.action !== "string" ||
    typeof candidate.description !== "string"
  ) {
    return null;
  }

  const taskType =
    candidate.taskType === "scheduled" || candidate.taskType === "conditional"
      ? candidate.taskType
      : "one-time";

  return {
    id: crypto.randomUUID(),
    type: "suggestion",
    action: candidate.action.trim(),
    description: candidate.description.trim(),
    taskType,
    scheduleSpec:
      typeof candidate.scheduleSpec === "string"
        ? candidate.scheduleSpec.trim() || null
        : null,
    conditionText:
      typeof candidate.conditionText === "string"
        ? candidate.conditionText.trim() || null
        : null,
    oneTimeAt:
      typeof candidate.oneTimeAt === "string"
        ? candidate.oneTimeAt.trim() || null
        : null,
  };
}

function parseStructuredAssistantOutput(text: string): {
  response: string;
  suggestions: TaskSuggestion[];
  parsedJson: boolean;
  rawText: string;
} {
  const parsedRaw = parseJsonFromModelText(text);
  const parsedEnvelope =
    parsedRaw && typeof parsedRaw === "object"
      ? (parsedRaw as {
          response?: unknown;
          suggestions?: unknown;
          suggestion?: unknown;
        })
      : null;

  const responseText =
    typeof parsedEnvelope?.response === "string"
      ? parsedEnvelope.response.trim()
      : "";

  const suggestions = Array.isArray(parsedEnvelope?.suggestions)
    ? parsedEnvelope.suggestions
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          return buildTaskSuggestion(
            item as Partial<TaskSuggestion> & {
              type?: string;
              taskType?: string;
            },
          );
        })
        .filter((item): item is TaskSuggestion => item !== null)
    : [];

  const fallbackSuggestions = Array.isArray(parsedEnvelope?.suggestions)
    ? suggestions
    : parsedEnvelope?.suggestion &&
        typeof parsedEnvelope.suggestion === "object"
      ? [
          buildTaskSuggestion(
            parsedEnvelope.suggestion as Partial<TaskSuggestion> & {
              type?: string;
              taskType?: string;
            },
          ),
        ].filter((item): item is TaskSuggestion => item !== null)
      : [];

  return {
    response: responseText || cleanFallbackAssistantText(text),
    suggestions: suggestions.length > 0 ? suggestions : fallbackSuggestions,
    parsedJson: parsedEnvelope !== null,
    rawText: text,
  };
}

describe("Structured Assistant Output", () => {
  it("parses strict JSON response and suggestions", () => {
    const output = parseStructuredAssistantOutput(
      JSON.stringify({
        response: "Final answer for the user.",
        suggestions: [
          {
            action: "track_stock",
            description: "Track Nvidia stock daily",
            taskType: "scheduled",
            scheduleSpec: "daily at 8:00 AM",
          },
        ],
      }),
    );

    assert.strictEqual(output.parsedJson, true);
    assert.strictEqual(output.response, "Final answer for the user.");
    assert.strictEqual(output.suggestions.length, 1);
    assert.strictEqual(output.suggestions[0].action, "track_stock");
  });

  it("handles wrapped JSON and ignores invalid suggestion entries", () => {
    const output = parseStructuredAssistantOutput(
      [
        "Internal note that should be ignored",
        JSON.stringify({
          response: "Wrapped response.",
          suggestion: {
            action: "set_reminder",
            description: "Remind me tomorrow",
            taskType: "one-time",
          },
          suggestions: [
            null,
            {
              action: "set_reminder",
              description: "Remind me tomorrow",
              taskType: "one-time",
            },
          ],
        }),
        "Trailing note",
      ].join("\n"),
    );

    assert.strictEqual(output.parsedJson, true);
    assert.strictEqual(output.response, "Wrapped response.");
    assert.strictEqual(output.suggestions.length, 1);
    assert.strictEqual(output.suggestions[0].action, "set_reminder");
  });

  it("falls back to cleaned plain text when JSON parsing fails", () => {
    const output = parseStructuredAssistantOutput(
      [
        "Constraint Check: do not reveal chain of thought",
        "Reasoning: hidden",
        "Final answer: Use the release branch.",
      ].join("\n"),
    );

    assert.strictEqual(output.parsedJson, false);
    assert.strictEqual(output.response.includes("Constraint Check"), false);
    assert.strictEqual(output.response.includes("Reasoning"), false);
    assert.strictEqual(output.response.includes("Final answer"), true);
    assert.deepStrictEqual(output.suggestions, []);
  });
});
