import type { TaskSuggestion } from "@/types/tasks";

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

function toTaskTypeValue(taskType: string): TaskSuggestion["taskType"] {
  if (taskType === "scheduled" || taskType === "conditional") {
    return taskType;
  }

  return "one-time";
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

  return {
    id: crypto.randomUUID(),
    type: "suggestion",
    action: candidate.action.trim(),
    description: candidate.description.trim(),
    taskType: toTaskTypeValue(candidate.taskType ?? "one-time"),
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

function normalizeTaskSuggestions(
  parsedEnvelope: {
    suggestions?: unknown;
    suggestion?: unknown;
  } | null,
): TaskSuggestion[] {
  const parsedSuggestions = Array.isArray(parsedEnvelope?.suggestions)
    ? parsedEnvelope.suggestions
    : parsedEnvelope?.suggestion
      ? [parsedEnvelope.suggestion]
      : [];

  return parsedSuggestions
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
    .filter((item): item is TaskSuggestion => item !== null);
}

export function parseStructuredAssistantOutput(text: string): {
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

  const cleanedResponse = responseText || cleanFallbackAssistantText(text);

  return {
    response: cleanedResponse,
    suggestions: normalizeTaskSuggestions(parsedEnvelope),
    parsedJson: parsedEnvelope !== null,
    rawText: text,
  };
}
