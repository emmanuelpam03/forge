import { NextRequest } from "next/server";
import { z } from "zod";
import { runChatGraphStream } from "@/ai/graph";

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
      return new Response(
        JSON.stringify({ error: "Invalid chat request payload." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const runId = crypto.randomUUID();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ event, payload })}\n`),
          );
        };

        void (async () => {
          send("start", {
            chatId: parsedBody.data.chatId,
            runId,
          });

          let assistantMessage = "";

          const result = await runChatGraphStream(
            {
              chatId: parsedBody.data.chatId,
              userMessage: parsedBody.data.message,
              runId,
            },
            (chunk) => {
              assistantMessage += chunk;
              send("chunk", {
                delta: chunk,
                content: assistantMessage,
              });
            },
            (status) => {
              send("status", { status });
            },
          );

          // Route-level validation: ensure response is not empty
          const finalMessage = (
            result.assistantMessage || assistantMessage
          ).trim();

          if (!finalMessage) {
            console.error(
              `Chat route: Empty response after streaming. Chat: ${result.chatId}, Intent: ${result.intent}, Tools: ${(result.toolsUsed || []).join(", ")}`,
            );
            send("done", {
              chatId: result.chatId,
              assistantMessage:
                "I wasn't able to generate a response. Please try again or rephrase your question.",
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
          } else {
            send("done", {
              chatId: result.chatId,
              assistantMessage: finalMessage,
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
          }

          controller.close();
        })().catch((error) => {
          console.error("Chat stream failed:", error);
          send("error", {
            error: "Failed to generate a response.",
          });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat route failed:", error);

    return new Response(
      JSON.stringify({ error: "Failed to generate a response." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
