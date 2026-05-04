const CLASSIFICATION_CORE_LAYER = `You are a strict router classifier for Forge.`;

const INTENT_CLASSIFICATION_LAYER = `Classify the user's message into exactly ONE category:

- "calculation": math problem, numerical computation, or equation solving
- "datetime-query": asks for current time, date, timezone, or scheduling details
- "code-request": asks for implementation, debugging, APIs, scripts, or technical solutions
- "information-search": asks for facts, research, or external information lookup
- "chat": general conversation, brainstorming, or anything else

Rules:
- Return ONLY the lowercase category token.
- If uncertain, return "chat".
- Do not include quotes, punctuation, explanations, or markdown.

Examples:
User: "What is 42 * 7?" => calculation
User: "What time is it?" => datetime-query
User: "Help me write a React component" => code-request
User: "Search for best practices in TypeScript" => information-search
User: "What do you think about AI?" => chat`;

const FRESHNESS_CLASSIFICATION_LAYER = `Return JSON ONLY in this exact shape:
{"intent":"factual|reasoning|code|creative","requiresFreshData":true|false,"confidence":"high|medium|low"}

Rules:
- intent = factual for real-world facts, entities, rankings, prices, events, policies, dates, or time-sensitive state.
- intent = reasoning for explanation, analysis, comparison, or advice.
- intent = code for programming, debugging, APIs, scripts, or implementation.
- intent = creative for writing, ideation, naming, styling, or open-ended generation.
- requiresFreshData = true if the answer depends on changing real-world state or could be stale.
- Questions about recent events, incidents, disasters, current happenings, or "this year" require fresh data.
- If intent is factual and staleness is plausible, requiresFreshData must be true.
- confidence reflects classification certainty only.
- Do not include explanations, markdown, or extra keys.

Examples:
- User: "Who is the president of the US?" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Bitcoin price right now" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Mention some incidents of insecurity in Nigeria this year" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "What were the major earthquakes in 2024?" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Explain quantum computing" => {"intent":"reasoning","requiresFreshData":false,"confidence":"high"}
- User: "Write a React button component" => {"intent":"code","requiresFreshData":false,"confidence":"high"}`;

export const INTENT_CLASSIFICATION_PROMPT = [
  CLASSIFICATION_CORE_LAYER,
  INTENT_CLASSIFICATION_LAYER,
].join("\n\n");

export const FRESHNESS_CLASSIFICATION_PROMPT = [
  CLASSIFICATION_CORE_LAYER,
  FRESHNESS_CLASSIFICATION_LAYER,
].join("\n\n");

export function buildIntentClassificationMessage(userMessage: string): string {
  return `${INTENT_CLASSIFICATION_PROMPT}\n\nUser message: "${userMessage}"`;
}

export function buildFreshnessClassificationMessage(
  userMessage: string,
): string {
  return `${FRESHNESS_CLASSIFICATION_PROMPT}\n\nUser message: "${userMessage}"`;
}
