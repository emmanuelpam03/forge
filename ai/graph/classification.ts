import type {
  ClassifiedIntent,
  ClassificationConfidence,
  ClassificationIntent,
} from "@/ai/graph/state";

export type QueryIntentType =
  | "knowledge"
  | "real_time"
  | "calculation"
  | "taskable";

export type QueryIntentClassification = {
  needsTools: boolean;
  type: QueryIntentType;
};

export type IntentDifficulty = "easy" | "medium" | "hard";
export type IntentVerbosity = "concise" | "balanced" | "detailed";
export type IntentAudienceLevel = "beginner" | "intermediate" | "expert";
export type IntentResponseMode =
  | "code"
  | "teach"
  | "plan"
  | "analyze"
  | "summarize"
  | "compare"
  | "support"
  | "chat";
export type IntentReasoningDepth = "light" | "standard" | "deep";
export type IntentMultiIntent = string[];

export type StructuredIntentClassification = {
  intent: string;
  difficulty: IntentDifficulty;
  verbosity: IntentVerbosity;
  audienceLevel: IntentAudienceLevel;
  toolUsage: string[];
  responseMode: IntentResponseMode;
  confidence: ClassificationConfidence;
  memoryRelevance: boolean;
  reasoningDepth: IntentReasoningDepth;
  multiIntent: IntentMultiIntent;
};

const KNOWN_INTENTS = new Set([
  "coding",
  "debugging",
  "research",
  "teaching",
  "planning",
  "casual conversation",
  "brainstorming",
  "architecture",
  "system design",
  "emotional support",
  "analysis",
  "summarization",
  "comparison",
  "automation tasks",
]);

const KNOWN_TOOL_USAGE = new Set([
  "web_search",
  "calculator",
  "datetime",
  "memory_lookup",
  "project_context",
  "code_execution",
]);

const KNOWN_RESPONSE_MODES = new Set([
  "code",
  "teach",
  "plan",
  "analyze",
  "summarize",
  "compare",
  "support",
  "chat",
]);

function normalizeText(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeDifficulty(
  value: string | undefined | null,
): IntentDifficulty {
  const normalized = normalizeText(value);
  if (
    normalized === "easy" ||
    normalized === "medium" ||
    normalized === "hard"
  ) {
    return normalized;
  }
  return "medium";
}

function normalizeVerbosity(value: string | undefined | null): IntentVerbosity {
  const normalized = normalizeText(value);
  if (
    normalized === "concise" ||
    normalized === "balanced" ||
    normalized === "detailed"
  ) {
    return normalized;
  }
  return "balanced";
}

function normalizeAudienceLevel(
  value: string | undefined | null,
): IntentAudienceLevel {
  const normalized = normalizeText(value);
  if (
    normalized === "beginner" ||
    normalized === "intermediate" ||
    normalized === "expert"
  ) {
    return normalized;
  }
  return "intermediate";
}

function normalizeResponseMode(
  value: string | undefined | null,
): IntentResponseMode {
  const normalized = normalizeText(value);
  if (KNOWN_RESPONSE_MODES.has(normalized as IntentResponseMode)) {
    return normalized as IntentResponseMode;
  }
  return "chat";
}

function normalizeToolUsage(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(typeof item === "string" ? item : ""))
    .filter((item) => KNOWN_TOOL_USAGE.has(item));
}

function normalizeMultiIntent(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(typeof item === "string" ? item : ""))
    .filter(Boolean)
    .filter((item) => KNOWN_INTENTS.has(item));
}

export function normalizeClassificationIntent(
  value: string | undefined | null,
): ClassificationIntent {
  if (value === "reasoning" || value === "code" || value === "creative") {
    return value;
  }

  return "factual";
}

export function normalizeClassificationConfidence(
  value: string | undefined | null,
): ClassificationConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "low";
}

function parseLegacyClassification(text: string): ClassifiedIntent {
  try {
    const parsed = JSON.parse(text) as Partial<ClassifiedIntent>;
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

function deriveStructuredFromLegacy(
  legacy: ClassifiedIntent,
): StructuredIntentClassification {
  const intentMap: Record<
    ClassifiedIntent["intent"],
    StructuredIntentClassification["intent"]
  > = {
    factual: "research",
    reasoning: "analysis",
    code: "coding",
    creative: "brainstorming",
  };

  const responseModeMap: Record<
    ClassifiedIntent["intent"],
    IntentResponseMode
  > = {
    factual: "analyze",
    reasoning: "analyze",
    code: "code",
    creative: "chat",
  };

  return {
    intent: intentMap[legacy.intent],
    difficulty: legacy.confidence === "high" ? "medium" : "hard",
    verbosity: legacy.requiresFreshData ? "detailed" : "balanced",
    audienceLevel: legacy.confidence === "low" ? "beginner" : "intermediate",
    toolUsage: legacy.requiresFreshData ? ["web_search"] : [],
    responseMode: responseModeMap[legacy.intent],
    confidence: legacy.confidence,
    memoryRelevance: legacy.intent !== "creative",
    reasoningDepth: legacy.requiresFreshData ? "deep" : "standard",
    multiIntent: [],
  };
}

export function parseStructuredIntentClassification(
  text: string,
): StructuredIntentClassification {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;

    return {
      intent:
        typeof parsed.intent === "string" &&
        KNOWN_INTENTS.has(normalizeText(parsed.intent))
          ? normalizeText(parsed.intent)
          : "casual conversation",
      difficulty: normalizeDifficulty(
        typeof parsed.difficulty === "string" ? parsed.difficulty : null,
      ),
      verbosity: normalizeVerbosity(
        typeof parsed.verbosity === "string" ? parsed.verbosity : null,
      ),
      audienceLevel: normalizeAudienceLevel(
        typeof parsed.audience_level === "string"
          ? parsed.audience_level
          : typeof parsed.audienceLevel === "string"
            ? parsed.audienceLevel
            : null,
      ),
      toolUsage: normalizeToolUsage(parsed.tool_usage),
      responseMode: normalizeResponseMode(
        typeof parsed.response_mode === "string"
          ? parsed.response_mode
          : typeof parsed.responseMode === "string"
            ? parsed.responseMode
            : null,
      ),
      confidence: normalizeClassificationConfidence(
        typeof parsed.confidence === "string" ? parsed.confidence : null,
      ),
      memoryRelevance:
        parsed.memory_relevance === true || parsed.memoryRelevance === true,
      reasoningDepth: (() => {
        const value = normalizeText(
          typeof parsed.reasoning_depth === "string"
            ? parsed.reasoning_depth
            : typeof parsed.reasoningDepth === "string"
              ? parsed.reasoningDepth
              : null,
        );
        if (value === "light" || value === "standard" || value === "deep") {
          return value;
        }
        return "standard";
      })(),
      multiIntent: normalizeMultiIntent(
        parsed.multi_intent ?? parsed.multiIntent ?? [],
      ),
    };
  } catch {
    return {
      intent: "casual conversation",
      difficulty: "medium",
      verbosity: "balanced",
      audienceLevel: "intermediate",
      toolUsage: [],
      responseMode: "chat",
      confidence: "low",
      memoryRelevance: false,
      reasoningDepth: "standard",
      multiIntent: [],
    };
  }
}

export function parseClassificationText(
  text: string,
): ClassifiedIntent & { structured?: StructuredIntentClassification } {
  const structured = parseStructuredIntentClassification(text);

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (
      typeof parsed.intent === "string" &&
      (parsed.requiresFreshData !== undefined ||
        parsed.confidence !== undefined)
    ) {
      const legacy = {
        intent: normalizeClassificationIntent(parsed.intent),
        requiresFreshData: parsed.requiresFreshData === true,
        confidence: normalizeClassificationConfidence(
          typeof parsed.confidence === "string" ? parsed.confidence : null,
        ),
      } as ClassifiedIntent;

      return {
        ...legacy,
        structured: deriveStructuredFromLegacy(legacy),
      };
    }
  } catch {
    // fall through to legacy defaults below
  }

  const legacy = parseLegacyClassification(text);

  return {
    ...legacy,
    structured:
      structured.intent === "casual conversation" &&
      structured.toolUsage.length === 0 &&
      structured.confidence === "low"
        ? deriveStructuredFromLegacy(legacy)
        : structured,
  };
}

export function deriveLegacyIntentFromStructured(
  structured: StructuredIntentClassification,
): ClassifiedIntent {
  const intentMap: Record<string, ClassifiedIntent["intent"]> = {
    coding: "code",
    debugging: "code",
    research: "factual",
    teaching: "reasoning",
    planning: "reasoning",
    "casual conversation": "creative",
    brainstorming: "creative",
    architecture: "reasoning",
    "system design": "reasoning",
    "emotional support": "creative",
    analysis: "reasoning",
    summarization: "reasoning",
    comparison: "reasoning",
    "automation tasks": "code",
  };

  return {
    intent: intentMap[structured.intent] ?? "factual",
    requiresFreshData:
      structured.toolUsage.includes("web_search") ||
      structured.toolUsage.includes("datetime"),
    confidence: structured.confidence,
  };
}

export function shouldForceWebSearchFromClassification(
  classification: ClassifiedIntent | null | undefined,
): boolean {
  if (!classification) {
    return false;
  }

  return (
    classification.intent === "factual" &&
    (classification.requiresFreshData || classification.confidence !== "high")
  );
}
