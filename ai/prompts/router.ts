import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { PROMPTS } from "@/ai/prompts/promptRegistry";
import { buildFreshnessClassificationMessage } from "@/ai/prompts/intent";
import { formatSelectedContext } from "@/ai/context/engine";
import type { ChatGraphState } from "@/ai/graph/state";

function resolveSpecialistPrompt(state: ChatGraphState): string {
  switch (state.taskCategory) {
    case "coding":
      return PROMPTS.coding;
    case "reasoning":
    case "explanation":
      return PROMPTS.reasoning;
    case "planning":
    case "trading":
      return PROMPTS.planning;
    default:
      return "";
  }
}

function resolveResponseMode(state: ChatGraphState): string {
  // Map internal task categories / intents to a concise response mode
  switch (state.taskCategory) {
    case "coding":
      return "code";
    case "reasoning":
    case "explanation":
      return "reasoning";
    case "planning":
      return "reasoning";
    case "trading":
      return "factual";
    default:
      // If intent explicitly requests creativity, prefer creative
      if (state.intent && /creative|story|poem|generate/i.test(state.intent)) {
        return "creative";
      }
      return "chat";
  }
}

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
  const topicTemplateLayer = resolveSpecialistPrompt(state);

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
    PROMPTS.system,
    PROMPTS.tools,
    topicTemplateLayer,
    // Short instruction that tells the formatter which high-level response shape to produce.
    `RESPONSE MODE: ${resolveResponseMode(state)} — Format the answer accordingly (one of: code, factual, reasoning, creative, chat).`,
    PROMPTS.formatter,
    context,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [new SystemMessage(systemPrompt), new HumanMessage(state.userMessage)];
}

export { buildFreshnessClassificationMessage };
