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

    // Get the parent of the original message (assistant message before it)
    // This ensures the edit branch links back to the same conversation point
    const parentId = target.parentId ?? null;

    // Create a new user message as a branch variant
    const branchId = crypto.randomUUID();
    const newUserMessage = await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: newContent,
        parentId,
        branchId,
      },
    });

    const runId = crypto.randomUUID();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        const sendBranchList = async () => {
          // Fetch all user message variants at the same parent level
          const branches = await prisma.message.findMany({
            where: { chatId, parentId, role: "user" },
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

          try {
            await sendBranchList();

            const result = await runChatGraphStream(
              {
                chatId,
                userMessage: newContent,
                runId,
                forceTool: null,
                classifiedIntent: null,
                parentMessageId: newUserMessage.id,
                branchId,
                skipUserCreate: true,
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

            send({
              type: "done",
              messageId: result.assistantMessageId ?? undefined,
              response: finalMessage,
              suggestions: result.suggestions ?? [],
            });
          } catch (err) {
            console.error("Edit stream failed:", err);
            send({ type: "status", message: "Failed to generate a response." });
            send({ type: "done", suggestions: [] });
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
        "Content-Type": "application/x-ndjson; charset=utf-8",
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
