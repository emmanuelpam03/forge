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
    // Isolated try-catch to prevent title persistence failure from aborting the response
    if (result.generatedTitle) {
      try {
        await prisma.chat.update({
          where: { id: result.chatId },
          data: { title: result.generatedTitle },
        });
      } catch (titleError) {
        console.error(
          `Failed to update chat title for chatId=${result.chatId}:`,
          {
            generatedTitle: result.generatedTitle,
            error:
              titleError instanceof Error
                ? titleError.message
                : String(titleError),
          },
        );
        // Continue without rethrowing—title update is non-critical
      }
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
