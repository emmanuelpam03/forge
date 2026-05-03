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

    const requestStartedAt = Date.now();
    let firstTokenAt: number | null = null;
    let placeholderSentAt: number | null = null;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: StreamEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          } catch (err) {
            // If enqueue fails, log and close controller to avoid hangs
            console.error("Failed to enqueue stream event:", err);
            try {
              controller.close();
            } catch {}
          }
        };

        void (async () => {
          let assistantMessage = "";
          let finalPersistedMessageId: string | undefined = undefined;

          try {
            placeholderSentAt = Date.now();
            console.info(
              JSON.stringify({
                event: "first_token_placeholder",
                chatId: hashIdentifierForLogging(parsedBody.data.chatId),
                runId: hashIdentifierForLogging(runId),
                ttftMs: placeholderSentAt - requestStartedAt,
              }),
            );

            send({ type: "status", message: "Thinking..." });

            // Graph handles classification, tool routing, and streaming tokens
            const result = await runChatGraphStream(
              {
                chatId: parsedBody.data.chatId,
                userMessage: parsedBody.data.message,
                runId,
                forceTool: null,
                classifiedIntent: null,
              },
              (event) => {
                // Track TTFT on first token forwarded
                if (event.type === "token") {
                  if (firstTokenAt === null) {
                    firstTokenAt = Date.now();
                    console.info("FIRST TOKEN SENT", {
                      chatId: hashIdentifierForLogging(parsedBody.data.chatId),
                      runId: hashIdentifierForLogging(runId),
                      ttftMs: firstTokenAt - requestStartedAt,
                    });
                    console.info(
                      JSON.stringify({
                        event: "first_token_forwarded",
                        chatId: hashIdentifierForLogging(
                          parsedBody.data.chatId,
                        ),
                        runId: hashIdentifierForLogging(runId),
                        ttftMs: firstTokenAt - requestStartedAt,
                      }),
                    );
                  }

                  assistantMessage += event.content;
                }

                send(event);
              },
            );

            // Route-level validation: ensure response is not empty
            const finalMessage = (
              result.assistantMessage || assistantMessage
            ).trim();
            finalPersistedMessageId = result.assistantMessageId ?? undefined;

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

              // Send a friendly fallback token so the UI never receives an empty answer
              send({
                type: "token",
                content:
                  "I wasn't able to generate a response. Please try again.",
              });
            }

            send({
              type: "done",
              messageId: finalPersistedMessageId,
            });
          } catch (error) {
            console.error("Chat stream failed:", error);

            // If no tokens were emitted, provide a fallback token so UI can render
            if (!firstTokenAt) {
              send({
                type: "token",
                content: "Failed to generate a response. Please try again.",
              });
            }

            send({ type: "status", message: "Failed to generate a response." });
            send({ type: "done" });
          } finally {
            try {
              console.info("STREAM CLOSED", {
                chatId: hashIdentifierForLogging(parsedBody.data.chatId),
                runId: hashIdentifierForLogging(runId),
                totalMs: Date.now() - requestStartedAt,
              });
              controller.close();
            } catch (e) {
              console.error("Failed to close stream controller:", e);
            }
          }
        })().catch((error) => {
          console.error("Chat stream failed:", error);
          try {
            controller.close();
          } catch {}
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
