import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  CHAT_SYSTEM_PROMPT,
  SUMMARIZATION_POLICY,
  WRITING_POLICY,
} from "@/ai/prompts/system";
import { formatSelectedContext } from "@/ai/context/engine";
import type { ChatGraphState } from "@/ai/graph/state";

function formatPreferences(state: ChatGraphState): string {
  if (state.preferences.length === 0) {
    return "No saved preferences.";
  }

  return state.preferences
    .map((preference) => {
      const category = preference.category ? `${preference.category}: ` : "";
      return `- ${category}${preference.key} = ${preference.value}`;
    })
    .join("\n");
}

function formatIntent(state: ChatGraphState): string {
  if (!state.intent) {
    return "";
  }
  return `User intent: ${state.intent}`;
}

function formatClassifier(state: ChatGraphState): string {
  if (!state.classifiedIntent) {
    return "";
  }

  return [
    "Classifier result:",
    `- intent: ${state.classifiedIntent.intent}`,
    `- requiresFreshData: ${state.classifiedIntent.requiresFreshData}`,
    `- confidence: ${state.classifiedIntent.confidence}`,
  ].join("\n");
}

function formatMemorySummary(state: ChatGraphState): string {
  if (!state.memorySummary) {
    return "No memory summary available.";
  }

  return `Version ${state.memorySummary.version}: ${state.memorySummary.summary}`;
}

function formatHistory(state: ChatGraphState): string {
  if (state.previousMessages.length === 0) {
    return "No previous messages.";
  }

  return state.previousMessages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

function formatToolContext(state: ChatGraphState): string {
  if (state.evidenceBundles.length === 0 && !state.toolContext) {
    return "No tool outputs captured.";
  }

  let context = "";

  // Include evidence bundles if available (newer flow)
  if (state.evidenceBundles.length > 0) {
    context = state.evidenceBundles
      .map((bundle) => `### ${bundle.tool}\n${bundle.content}`)
      .join("\n\n");
  } else if (state.toolContext) {
    // Fallback to legacy toolContext
    context = state.toolContext;
  }

  // Include synthesis note if available
  if (state.synthesisNote) {
    context += `\n\n**Note:** ${state.synthesisNote}`;
  }

  return context;
}

function formatEvidencePriorityContext(state: ChatGraphState): string {
  const sections: string[] = [];

  if (state.evidenceBundles.length > 0 || state.toolContext) {
    sections.push("Tool evidence:");
    sections.push(formatToolContext(state));
  }

  if (state.classifiedIntent) {
    sections.push("", formatClassifier(state));
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

  return `Tools used: ${state.toolPlan.toolsNeeded.join(", ")} (${state.executionMode})`;
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
      .join("\n\n");
  } else {
    // Legacy fallback to raw snapshot formatting
    context = [
      evidencePriorityContext,
      "Project context:",
      formatMemorySummary(state),
      "",
      formatIntent(state),
      "",
      "Tool context:",
      formatToolContext(state),
      "",
      formatToolPlan(state),
      "",
      "User preferences:",
      formatPreferences(state),
      "",
      "Recent conversation:",
      formatHistory(state),
    ]
      .filter((line) => line !== "") // Remove empty intent lines
      .join("\n");
  }

  const systemPrompt = [
    CHAT_SYSTEM_PROMPT,
    SUMMARIZATION_POLICY,
    WRITING_POLICY,
    context,
  ].join("\n\n");

  return [new SystemMessage(systemPrompt), new HumanMessage(state.userMessage)];
}

/**
 * Build a prompt for classifying whether the user message requires fresh data.
 * The classifier should return a JSON object with fields:
 * {"intent": "factual|reasoning|coding|creative|chat", "requiresFreshData": true|false, "confidence": "high|medium|low"}
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
- requiresFreshData = true if the answer depends on real-world state, can change over time, may be outdated since training, or involves positions, prices, rankings, events, or factual state.
- If intent is factual and the answer might be stale, requiresFreshData must be true.
- confidence should reflect how sure you are in the classification, not whether you know the answer.
- Do not include explanations, markdown, or extra keys.

Examples:
- User: "Who is the president of the US?" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Bitcoin price right now" => {"intent":"factual","requiresFreshData":true,"confidence":"high"}
- User: "Explain quantum computing" => {"intent":"reasoning","requiresFreshData":false,"confidence":"high"}
- User: "Write a React button component" => {"intent":"code","requiresFreshData":false,"confidence":"high"}

User message: "${userMessage}"`;

  return prompt;
}
