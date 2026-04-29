import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { runChatGraph } from "@/ai/graph";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  chatId: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = chatRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid chat request payload." },
        { status: 400 },
      );
    }

    const result = await runChatGraph({
      chatId: parsedBody.data.chatId,
      userMessage: parsedBody.data.message,
      runId: crypto.randomUUID(),
    });

    // Update chat title if one was generated (first message)
    if (result.generatedTitle) {
      await prisma.chat.update({
        where: { id: result.chatId },
        data: { title: result.generatedTitle },
      });
    }

    return NextResponse.json({
      chatId: result.chatId,
      assistantMessage: result.assistantMessage,
      modelUsed: result.modelUsed,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      runId: result.runId,
      intent: result.intent,
      toolsUsed: result.toolsUsed,
      generatedTitle: result.generatedTitle,
    });
  } catch (error) {
    console.error("Chat route failed:", error);

    return NextResponse.json(
      { error: "Failed to generate a response." },
      { status: 500 },
    );
  }
}
