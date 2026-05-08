import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildFreshnessClassificationMessage } from "@/ai/prompts/intent.ts";
import {
  parseClassificationText,
  shouldForceWebSearchFromClassification,
} from "@/ai/graph/classification.ts";

const factualQueries = [
  "Who is the current president of the United States?",
  "Bitcoin price right now",
  "Latest iPhone model",
  "Current inflation rate US",
  "Who won the last World Cup",
];

for (const query of factualQueries) {
  const promptPath = resolve(process.cwd(), "ai/prompts/intent.ts");
  const promptSource = readFileSync(promptPath, "utf8");

  assert.ok(
    promptSource.includes("Return JSON ONLY in this exact shape"),
    `prompt contract missing for: ${query}`,
  );
  assert.ok(
    promptSource.includes(
      "requiresFreshData = true if the answer depends on changing real-world state or could be stale.",
    ),
    `fresh-data rule missing for: ${query}`,
  );

  assert.ok(
    buildFreshnessClassificationMessage(query).includes(
      "Return JSON ONLY in this exact shape",
    ),
  );

  const forcedClassification = parseClassificationText(
    JSON.stringify({
      intent: "factual",
      requiresFreshData: true,
      confidence: "high",
    }),
  );

  assert.equal(
    shouldForceWebSearchFromClassification(forcedClassification),
    true,
    `expected forced web search for: ${query}`,
  );

  const lowConfidenceClassification = parseClassificationText(
    JSON.stringify({
      intent: "factual",
      requiresFreshData: false,
      confidence: "medium",
    }),
  );

  assert.equal(
    shouldForceWebSearchFromClassification(lowConfidenceClassification),
    true,
    `expected fail-closed web search for low-confidence factual query: ${query}`,
  );
}

const nonFreshClassification = parseClassificationText(
  JSON.stringify({
    intent: "reasoning",
    requiresFreshData: false,
    confidence: "high",
  }),
);

assert.equal(
  shouldForceWebSearchFromClassification(nonFreshClassification),
  false,
  "reasoning queries should not force web search",
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      checkedQueries: factualQueries.length,
      forcedCases: factualQueries.length * 2,
      nonForcedCases: 1,
    },
    null,
    2,
  ),
);
