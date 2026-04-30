import type {
  ClassifiedIntent,
  ClassificationConfidence,
  ClassificationIntent,
} from "@/ai/graph/state";

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
