import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { runChatGraphStream, type StreamEvent } from "@/ai/graph";
import { hashIdentifierForLogging } from "@/lib/logging";

export const runtime = "nodejs";

const regenRequestSchema = z.object({
  chatId: z.string().min(1),
  assistantMessageId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = regenRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { chatId, assistantMessageId } = parsed.data;

    const target = await prisma.message.findUnique({
      where: { id: assistantMessageId },
    });
    if (!target) {
      return new Response(JSON.stringify({ error: "Message not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (target.chatId !== chatId) {
      return new Response(
        JSON.stringify({ error: "Message does not belong to chat." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (target.role !== "assistant") {
      return new Response(
        JSON.stringify({
          error: "Only assistant messages can be regenerated.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Determine the parent user message for context
    let parentId = target.parentId ?? null;
    if (!parentId) {
      // Find the latest user message before this assistant message
      const prev = await prisma.message.findFirst({
        where: { chatId, role: "user", createdAt: { lt: target.createdAt } },
        orderBy: { createdAt: "desc" },
      });
      parentId = prev?.id ?? null;
    }

    const runId = crypto.randomUUID();
    const branchId = crypto.randomUUID();
    const encoder = new TextEncoder();
    const assistantPlaceholder = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: "",
        parentId,
        branchId,
        runId,
      },
    });

    const stream = new ReadableStream({
      start(controller) {
        let controllerClosed = false;

        const safeClose = () => {
          if (controllerClosed) {
            return;
          }

          controllerClosed = true;
          try {
            controller.close();
          } catch {
            // No-op: the stream may already be closed/cancelled.
          }
        };

        const send = (event: StreamEvent): boolean => {
          if (controllerClosed) {
            return false;
          }

          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
            return true;
          } catch (error) {
            controllerClosed = true;
            console.warn("Regenerate SSE send skipped after close:", error);
            return false;
          }
        };

        const sendBranchList = async () => {
          const branches = await prisma.message.findMany({
            where: { chatId, parentId, role: "assistant" },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              parentId: true,
              branchId: true,
              createdAt: true,
            },
          });

          send({
            type: "branches",
            parentId,
            branches: branches.map((branch) => ({
              id: branch.id,
              content: branch.content,
              parentId: branch.parentId,
              branchId: branch.branchId,
              createdAt: branch.createdAt.toISOString(),
            })),
          });
        };

        void (async () => {
          let assistantMessage = "";
          let persistProgress: Promise<unknown> = Promise.resolve();

          send({
            type: "placeholder",
            messageId: assistantPlaceholder.id,
            branchId,
            parentId,
          });
          await sendBranchList();

          try {
            const result = await runChatGraphStream(
              {
                chatId,
                userMessage:
                  (
                    await prisma.message.findUnique({
                      where: { id: parentId ?? undefined },
                    })
                  )?.content ?? "",
                runId,
                forceTool: null,
                classifiedIntent: null,
                parentMessageId: parentId ?? null,
                branchId,
                assistantMessageId: assistantPlaceholder.id,
                skipUserCreate: true,
              },
              (event) => {
                if (event.type === "token") {
                  assistantMessage += event.content;
                  persistProgress = persistProgress
                    .then(() =>
                      prisma.message.update({
                        where: { id: assistantPlaceholder.id },
                        data: {
                          content: assistantMessage,
                          branchId,
                        },
                      }),
                    )
                    .catch((error) => {
                      console.error(
                        "Failed to persist regenerate progress:",
                        error,
                      );
                    });
                }

                send(event);
              },
            );

            await persistProgress;
            await sendBranchList();

            const finalMessage = (
              result.assistantMessage || assistantMessage
            ).trim();

            if (!finalMessage) {
              await prisma.message
                .delete({
                  where: { id: assistantPlaceholder.id },
                })
                .catch(() => null);

              console.error(
                JSON.stringify({
                  error: "empty-response-after-regen-stream",
                  chat_id: hashIdentifierForLogging(result.chatId),
                  run_id: hashIdentifierForLogging(result.runId),
                  intent: result.intent,
                }),
              );

              send({
                type: "status",
                message: "I wasn't able to generate a response.",
              });
            }

            send({
              type: "done",
              response: finalMessage,
              suggestions: result.suggestions ?? [],
            });
          } catch (err) {
            console.error("Regenerate stream failed:", err);
            await prisma.message
              .delete({
                where: { id: assistantPlaceholder.id },
              })
              .catch(() => null);
            send({ type: "status", message: "Failed to generate a response." });
            send({
              type: "done",
              suggestions: [],
            });
          }

          safeClose();
        })().catch((error) => {
          console.error("Regenerate stream failed:", error);
          safeClose();
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
    console.error("Chat regenerate route failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to regenerate message." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
