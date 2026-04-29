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
  // Use selected context from engine if available, otherwise fall back to raw snapshots
  let context: string;

  if (state.selectedContext) {
    context = formatSelectedContext(state.selectedContext);
  } else {
    // Legacy fallback to raw snapshot formatting
    context = [
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
