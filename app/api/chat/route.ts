import { NextRequest } from "next/server";
import { z } from "zod";
import { runChatGraphStream, type StreamEvent } from "@/ai/graph";
import { hashIdentifierForLogging } from "@/lib/logging";

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
        const send = (event: StreamEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        void (async () => {
          let assistantMessage = "";

          try {
            // Graph handles all classification and tool forcing decisions
            const result = await runChatGraphStream(
              {
                chatId: parsedBody.data.chatId,
                userMessage: parsedBody.data.message,
                runId,
                forceTool: null,
                classifiedIntent: null,
              },
              (event) => {
                if (event.type === "token") {
                  assistantMessage += event.content;
                }

                send(event);
              },
            );

            // Route-level validation: ensure response is not empty
            const finalMessage = (
              result.assistantMessage || assistantMessage
            ).trim();

            if (!finalMessage) {
              console.error(
                JSON.stringify({
                  error: "empty-response-after-streaming",
                  chat_id: hashIdentifierForLogging(result.chatId),
                  run_id: hashIdentifierForLogging(result.runId),
                  intent: result.intent,
                  tools_used: result.toolsUsed || [],
                  streamed_length: assistantMessage.length,
                }),
              );

              send({
                type: "status",
                message:
                  "I wasn't able to generate a response. Please try again.",
              });
            }

            send({ type: "done" });
          } catch (error) {
            console.error("Chat stream failed:", error);
            send({
              type: "status",
              message: "Failed to generate a response.",
            });
            send({ type: "done" });
          }

          controller.close();
        })().catch((error) => {
          console.error("Chat stream failed:", error);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
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
