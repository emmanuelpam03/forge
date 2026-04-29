import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { CHAT_SYSTEM_PROMPT } from "@/ai/prompts/system";
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
  if (!state.toolContext) {
    return "No tool outputs captured.";
  }

  return state.toolContext;
}

export function buildChatMessages(state: ChatGraphState): BaseMessage[] {
  const context = [
    "Project context:",
    formatMemorySummary(state),
    "",
    formatIntent(state),
    "",
    "Tool context:",
    formatToolContext(state),
    "",
    "User preferences:",
    formatPreferences(state),
    "",
    "Recent conversation:",
    formatHistory(state),
  ]
    .filter((line) => line !== "") // Remove empty intent lines
    .join("\n");

  return [
    new SystemMessage(`${CHAT_SYSTEM_PROMPT}\n\n${context}`),
    new HumanMessage(state.userMessage),
  ];
}
