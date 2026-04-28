import "server-only";

import prisma from "@/lib/prisma";
import type {
  ChatMessageSnapshot,
  MemorySummarySnapshot,
  PreferenceSnapshot,
} from "@/ai/graph/state";

export type LoadedChatContext = {
  previousMessages: ChatMessageSnapshot[];
  preferences: PreferenceSnapshot[];
  memorySummary: MemorySummarySnapshot | null;
};

export async function loadChatContext(
  chatId: string,
): Promise<LoadedChatContext> {
  const [chat, previousMessages, preferences, memorySummary] =
    await Promise.all([
      prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true },
      }),
      prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.preference.findMany({
        orderBy: [{ category: "asc" }, { key: "asc" }],
      }),
      prisma.memorySummary.findFirst({
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  if (!chat) {
    throw new Error(`Chat ${chatId} was not found.`);
  }

  return {
    previousMessages: previousMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      modelUsed: message.modelUsed,
      provider: message.provider,
      tokensInput: message.tokensInput,
      tokensOutput: message.tokensOutput,
      latencyMs: message.latencyMs,
      runId: message.runId,
      traceId: message.traceId,
    })),
    preferences: preferences.map((preference) => ({
      key: preference.key,
      value: preference.value,
      category: preference.category,
    })),
    memorySummary: memorySummary
      ? {
          id: memorySummary.id,
          summary: memorySummary.summary,
          version: memorySummary.version,
          updatedAt: memorySummary.updatedAt.toISOString(),
        }
      : null,
  };
}
