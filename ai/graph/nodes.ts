import "server-only";

import { type AIMessage, type BaseMessage } from "@langchain/core/messages";
import prisma from "@/lib/prisma";
import { createGeminiModel } from "@/ai/models";
import { buildChatMessages } from "@/ai/prompts/router";
import { loadChatContext } from "@/ai/memory/extractor";
import type { ChatGraphState } from "@/ai/graph/state";

function toTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object") {
          const textPart = part as { text?: string; content?: string };
          return textPart.text ?? textPart.content ?? "";
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function getUsageCounts(message: AIMessage) {
  const usageMetadata = message.usage_metadata;
  const responseMetadata = message.response_metadata as {
    usageMetadata?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  return {
    inputTokens:
      usageMetadata?.input_tokens ??
      responseMetadata?.usageMetadata?.input_tokens ??
      0,
    outputTokens:
      usageMetadata?.output_tokens ??
      responseMetadata?.usageMetadata?.output_tokens ??
      0,
  };
}

function getModelName(message: AIMessage): string {
  const responseMetadata = message.response_metadata as {
    model_name?: string;
    modelName?: string;
  };

  return (
    responseMetadata?.model_name ?? responseMetadata?.modelName ?? "gemini"
  );
}

export async function loadContextNode(state: ChatGraphState) {
  const context = await loadChatContext(state.chatId);

  return {
    previousMessages: context.previousMessages,
    preferences: context.preferences,
    memorySummary: context.memorySummary,
  };
}

export async function generateResponseNode(state: ChatGraphState) {
  const model = createGeminiModel();
  const messages = buildChatMessages(state);
  const startedAt = Date.now();
  const response = (await model.invoke(messages as BaseMessage[])) as AIMessage;
  const assistantMessage = toTextContent(response.content);
  const { inputTokens, outputTokens } = getUsageCounts(response);

  return {
    assistantMessage,
    modelUsed: getModelName(response),
    provider: "google-genai",
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  };
}

export async function saveMessagesNode(state: ChatGraphState) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        chatId: state.chatId,
        role: "user",
        content: state.userMessage,
      },
    });

    await tx.message.create({
      data: {
        chatId: state.chatId,
        role: "assistant",
        content: state.assistantMessage,
        modelUsed: state.modelUsed || null,
        provider: state.provider || null,
        tokensInput: state.inputTokens || null,
        tokensOutput: state.outputTokens || null,
        latencyMs: state.latencyMs || null,
        runId: state.runId || null,
        traceId: state.traceId || null,
      },
    });

    await tx.chat.update({
      where: { id: state.chatId },
      data: {
        lastMessageAt: now,
      },
    });

    await tx.chatRunAnalytics.create({
      data: {
        chatId: state.chatId,
        modelUsed: state.modelUsed || null,
        provider: state.provider || null,
        latencyMs: state.latencyMs || null,
        tokensInput: state.inputTokens || null,
        tokensOutput: state.outputTokens || null,
        runId: state.runId || null,
        traceId: state.traceId || null,
        status: "completed",
      },
    });
  });

  return {
    traceId: state.traceId,
  };
}
