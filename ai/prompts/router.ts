import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { SYSTEM_PROMPT } from "@/ai/prompts/system";
import { SUMMARIZATION_POLICY } from "@/ai/prompts/summarization";
import { WRITING_POLICY } from "@/ai/prompts/writing";
import { formatSelectedContext } from "@/ai/context/engine";
import type { ChatGraphState } from "@/ai/graph/state";

function formatPreferences(state: ChatGraphState): string {
  if (state.preferences.length === 0) {
    return "No saved preferences.";
  }

  return state.preferences
    .map((preference) => {
      const category = preference.category ? `${preference.category} ` : "";
      return `${category}${preference.key} = ${preference.value}`;
    })
    .join("; ");
}

function formatIntent(state: ChatGraphState): string {
  if (!state.intent) {
    return "";
  }
  return `User intent is ${state.intent}.`;
}

function formatQueryIntent(state: ChatGraphState): string {
  if (!state.queryIntent) {
    return "";
  }

  return `Current query intent is ${state.queryIntent.type} and tools are ${state.queryIntent.needsTools ? "needed" : "not needed"}.`;
}

function formatMemorySummary(state: ChatGraphState): string {
  if (!state.memorySummary) {
    return "No memory summary available.";
  }

  return `Memory summary version ${state.memorySummary.version}: ${state.memorySummary.summary}`;
}

function formatHistory(state: ChatGraphState): string {
  if (state.previousMessages.length === 0) {
    return "No previous messages.";
  }

  return state.previousMessages
    .map((message) => `${message.role} said ${message.content}`)
    .join(" ");
}

function formatToolContext(state: ChatGraphState): string {
  if (state.evidenceBundles.length === 0 && !state.toolContext) {
    return "No tool outputs captured.";
  }

  let context = "";

  // Include evidence bundles if available (newer flow)
  if (state.evidenceBundles.length > 0) {
    context = state.evidenceBundles
      .map((bundle) => `${bundle.tool} evidence: ${bundle.content}`)
      .join(" ");
  } else if (state.toolContext) {
    // Fallback to legacy toolContext
    context = state.toolContext;
  }

  // Include synthesis note if available
  if (state.synthesisNote) {
    context += ` Synthesis note: ${state.synthesisNote}`;
  }

  return context;
}

function formatEvidencePriorityContext(state: ChatGraphState): string {
  const sections: string[] = [];

  if (state.evidenceBundles.length > 0 || state.toolContext) {
    sections.push(
      `Verified tool evidence includes ${formatToolContext(state)}.`,
    );
  }

  if (state.queryIntent) {
    sections.push(formatQueryIntent(state));
  }

  return sections.join("\n").trim();
}

function formatToolPlan(state: ChatGraphState): string {
  if (
    !state.toolPlan ||
    state.toolPlan.toolsNeeded.length === 0 ||
    !state.executionMode
  ) {
    return "";
  }

  return `Tools used were ${state.toolPlan.toolsNeeded.join(", ")} in ${state.executionMode} mode.`;
}
export function buildChatMessages(state: ChatGraphState): BaseMessage[] {
  const evidencePriorityContext = formatEvidencePriorityContext(state);

  // Use selected context from engine if available, otherwise fall back to raw snapshots.
  // Tool evidence is always prepended so fresh search results outrank memory.
  let context: string;

  if (state.selectedContext) {
    const selectedContext = formatSelectedContext(state.selectedContext);
    context = [evidencePriorityContext, selectedContext]
      .filter(Boolean)
      .join(" ");
  } else {
    // Legacy fallback to raw snapshot formatting
    context = [
      evidencePriorityContext,
      `Project context is ${formatMemorySummary(state)}.`,
      formatIntent(state),
      formatToolContext(state),
      formatToolPlan(state),
      `User preferences are ${formatPreferences(state)}.`,
      `Recent conversation is ${formatHistory(state)}.`,
    ]
      .filter((line) => line !== "")
      .join(" ");
  }

  const systemPrompt = [
    SYSTEM_PROMPT,
    SUMMARIZATION_POLICY,
    WRITING_POLICY,
    context,
  ].join("\n\n");

  return [new SystemMessage(systemPrompt), new HumanMessage(state.userMessage)];
}

/**
 * Build a prompt for classifying whether the user message requires fresh data.
 * The classifier should return a JSON object with fields:
 * {"intent": "factual|reasoning|code|creative", "requiresFreshData": true|false, "confidence": "high|medium|low"}
 */
export function buildFreshnessClassificationMessage(
  userMessage: string,
): string {
  const prompt = `You are a strict router classifier for Forge.

Return JSON ONLY in this exact shape:
{"intent":"factual|reasoning|code|creative","requiresFreshData":true|false,"confidence":"high|medium|low"}
Rules:
- intent = factual for questions about real-world facts, people, places, organizations, products, rankings, prices, events, policies, dates, time-sensitive state, or anything that can become outdated.
- intent = reasoning for explanation, analysis, comparison, or advice.
- intent = code for programming, debugging, APIs, scripts, or technical implementation.
- intent = creative for writing, ideation, styling, naming, or open-ended generation.
- requiresFreshData = true if the answer depends on real-world state, can change over time, may be outdated since training, or involves positions, prices, rankings, events, incidents, or factual state.
- CRITICAL: Questions about recent events, incidents, security matters, accidents, disasters, or current happenings ALWAYS require fresh data.
- CRITICAL: Questions asking "this year" or about recent timeframes ALWAYS require fresh data to get current dates and details.
- If intent is factual and the answer might be stale, requiresFreshData must be true.
- confidence should reflect how sure you are in the classification, not whether you know the answer.
- Do not include explanations, markdown, or extra keys.

Examples:
- User: "Who is the president of the US?" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Bitcoin price right now" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Mention some incidents of insecurity in Nigeria this year" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "What were the major earthquakes in 2024?" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Explain quantum computing" => {"intent":"reasoning","requiresFreshData":false,"confidence":"high"}
- User: "Write a React button component" => {"intent":"code","requiresFreshData":false,"confidence":"high"}

User message: "${userMessage}"`;

  return prompt;
}
