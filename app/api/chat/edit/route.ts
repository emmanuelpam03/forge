import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { runChatGraphStream, type StreamEvent } from "@/ai/graph";
import { hashIdentifierForLogging } from "@/lib/logging";

export const runtime = "nodejs";

const editRequestSchema = z.object({
  chatId: z.string().min(1),
  messageId: z.string().min(1),
  newContent: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = editRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { chatId, messageId, newContent } = parsed.data;

    // Validate target message exists and is a user message
    const target = await prisma.message.findUnique({
      where: { id: messageId },
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

    if (target.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Only user messages can be edited." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Truncate conversation after this message and update the message content
    await prisma.$transaction(
      async (tx) => {
        await tx.message.deleteMany({
          where: {
            chatId,
            createdAt: { gt: target.createdAt },
          },
        });

        await tx.message.update({
          where: { id: messageId },
          data: { content: newContent },
        });
      },
      { timeout: 15000 },
    );

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
            const result = await runChatGraphStream(
              {
                chatId,
                userMessage: newContent,
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

            const finalMessage = (
              result.assistantMessage || assistantMessage
            ).trim();

            if (!finalMessage) {
              console.error(
                JSON.stringify({
                  error: "empty-response-after-edit-stream",
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

            send({ type: "done" });
          } catch (err) {
            console.error("Edit stream failed:", err);
            send({ type: "status", message: "Failed to generate a response." });
            send({ type: "done" });
          }

          controller.close();
        })().catch((error) => {
          console.error("Edit stream failed:", error);
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
    console.error("Chat edit route failed:", error);
    return new Response(JSON.stringify({ error: "Failed to edit message." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
