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

const REAL_TIME_PATTERNS: RegExp[] = [
  /\b(latest|current|today|currently|right now|live|breaking|news|price|prices|stock|stocks|rank|ranking|rankings|score|scores)\b/i,
  /\b(what(?:'s| is)? the (?:current|latest)|how much is|who is the current|current value|live value)\b/i,
  /\b(time|timezone|date|day of week|calendar)\b/i,
  /\b(this morning|this afternoon|this evening|this week|this month|this year)\b/i,
];

const CALCULATION_PATTERNS: RegExp[] = [
  /\b(calculate|compute|solve|evaluate|figure out)\b/i,
  /\d+\s*[%x*/+-]\s*\d+/,
  /\b(percent|percentage|conversion|convert|rate|margin|interest|compound)\b/i,
  /\b(of|per|divided by|multiplied by|times|minus|plus)\b/i,
];

const TASKABLE_PATTERNS: RegExp[] = [
  /\b(track|monitor|remind(?: me)?|notify me|alert me|follow up|follow-up|schedule|check in|keep an eye on)\b/i,
];

const PROJECT_LOOKUP_PATTERNS: RegExp[] = [
  /\b(project|workspace|this chat|this conversation|previous decision|prior decision|earlier discussion|history|what did we decide)\b/i,
];

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

function matchesAny(patterns: RegExp[], query: string): boolean {
  return patterns.some((pattern) => pattern.test(query));
}

function looksLikeCalculation(query: string): boolean {
  return (
    matchesAny(CALCULATION_PATTERNS, query) ||
    (/\d/.test(query) && /[=+\-*/%]/.test(query))
  );
}

function looksLikeRealTime(query: string): boolean {
  return matchesAny(REAL_TIME_PATTERNS, query);
}

function looksLikeTaskable(query: string): boolean {
  return matchesAny(TASKABLE_PATTERNS, query);
}

function looksLikeProjectLookup(query: string): boolean {
  return matchesAny(PROJECT_LOOKUP_PATTERNS, query);
}

export function classifyQueryIntent(query: string): QueryIntentClassification {
  const normalized = normalizeQuery(query).toLowerCase();

  if (!normalized) {
    return { needsTools: false, type: "knowledge" };
  }

  if (looksLikeCalculation(normalized)) {
    return { needsTools: true, type: "calculation" };
  }

  if (looksLikeTaskable(normalized)) {
    return { needsTools: false, type: "taskable" };
  }

  if (looksLikeRealTime(normalized)) {
    return { needsTools: true, type: "real_time" };
  }

  if (
    looksLikeProjectLookup(normalized) ||
    /\b(search|lookup|find|research|verify|check)\b/i.test(normalized)
  ) {
    return { needsTools: true, type: "knowledge" };
  }

  return { needsTools: false, type: "knowledge" };
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

export function parseClassificationText(text: string): ClassifiedIntent {
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
