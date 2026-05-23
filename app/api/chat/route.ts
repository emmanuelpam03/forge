import { NextRequest } from "next/server";
import { z } from "zod";
import { runChatGraphStream, type StreamEvent } from "@/ai/graph";
import { info, error as logError, debug } from "@/lib/logger";
import { initializeBackgroundWorkers } from "@/lib/background-worker";
import { DEFAULT_PROMPT_BEHAVIOR_CONTROLS } from "@/ai/prompts/control.types";
import { selectedOptionIdSchema } from "@/ai/selected-options";
import { toResponse, ApiError } from "@/lib/error-response";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { inferAttachmentKind } from "@/lib/attachment-types";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  chatId: z.string().min(1),
  message: z.string().min(1),
  model: z.string().optional(),
  provider: z.enum(["openrouter"]).optional(),
  promptBehavior: z
    .object({
      persona: z.enum(["auto", "none", "senior-engineer"]),
    })
    .optional(),
  selectedOptions: z.array(selectedOptionIdSchema).optional(),
  // attachments should be an array of attachment IDs; server will resolve them
  attachments: z.array(z.string().min(1)).optional(),
});

function extensionToMime(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    case ".md":
      return "text/markdown";
    case ".json":
      return "application/json";
    case ".csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
}

export async function POST(request: NextRequest) {
  // Initialize background workers on first request (lazy initialization)
  void initializeBackgroundWorkers().catch((error) => {
    logError("background_workers_init_failed", { error });
  });

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

    // Resolve attachment IDs to server-trusted attachment records by
    // inspecting the upload directory. Ignore IDs that do not resolve.
    const attachmentIds = parsedBody.data.attachments ?? [];
    const resolvedAttachments: unknown[] = [];
    for (const attachmentId of attachmentIds) {
      try {
        const dir = join(process.cwd(), "public", "uploads", parsedBody.data.chatId, attachmentId);
        const files = await readdir(dir);
        if (!files || files.length === 0) continue;
        const fileName = files[0];
        const filePath = join(dir, fileName);
        const stats = await stat(filePath);
        const ext = extname(fileName).toLowerCase();
        const mimeType = extensionToMime(ext);

        resolvedAttachments.push({
          id: attachmentId,
          chatId: parsedBody.data.chatId,
          name: fileName,
          originalName: fileName,
          mimeType,
          sizeBytes: stats.size,
          checksum: "",
          kind: inferAttachmentKind({ name: fileName, mimeType }),
          status: "ready",
          storageUrl: `/uploads/${parsedBody.data.chatId}/${attachmentId}/${fileName}`,
          storagePath: filePath,
          uploadedAt: stats.mtime.toISOString(),
        });
      } catch {
        // skip unresolved attachment IDs
        continue;
      }
    }

    const runId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const encoder = new TextEncoder();

    const requestStartedAt = Date.now();
    let firstTokenAt: number | null = null;
    let placeholderSentAt: number | null = null;
    const debugStream = process.env.DEBUG_STREAM === "1";

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: StreamEvent) => {
          if (debugStream) {
            debug("stream_forward", {
              type: event.type,
              chatId: parsedBody.data.chatId,
              runId,
              timestampMs: Date.now() - requestStartedAt,
            });
          }

          // Verbose event logging removed for cleaner console output;
          // use DEBUG_STREAM=1 env var for detailed streaming diagnostics if needed.

          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch (err) {
            // If enqueue fails, log and close controller to avoid hangs
            logError("enqueue_failed", { error: err });
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
            info("first_token_placeholder", {
              chatId: parsedBody.data.chatId,
              runId,
              ttftMs: placeholderSentAt - requestStartedAt,
            });

            // Graph handles classification, tool routing, and streaming tokens
            const result = await runChatGraphStream(
              {
                chatId: parsedBody.data.chatId,
                userMessage: parsedBody.data.message,
                runId,
                assistantMessageId,
                forceTool: null,
                classifiedIntent: null,
                model: parsedBody.data.model,
                provider: parsedBody.data.provider,
                selectedOptions: parsedBody.data.selectedOptions ?? [],
                attachments: resolvedAttachments,
                promptBehavior: parsedBody.data.promptBehavior
                  ? {
                      ...DEFAULT_PROMPT_BEHAVIOR_CONTROLS,
                      persona: parsedBody.data.promptBehavior.persona,
                    }
                  : undefined,
              },
              (event) => {
                if (event.type === "token") {
                  if (firstTokenAt === null) {
                    firstTokenAt = Date.now();
                  }

                  assistantMessage += event.content;
                }

                send(event);
              },
            );

            // Route-level validation: ensure response is not empty
            const finalMessage = result.assistantMessage || assistantMessage;
            finalPersistedMessageId = result.assistantMessageId ?? undefined;

            if (!finalMessage) {
              logError("empty-response-after-streaming", {
                chatId: result.chatId,
                runId: result.runId,
                intent: result.intent,
                toolsUsed: result.toolsUsed || [],
                streamedLength: assistantMessage.length,
              });

              // Send a friendly fallback token so the UI never receives an empty answer
              send({
                type: "token",
                content:
                  "I wasn't able to generate a response. Please try again.",
              });
            }

            info("graph_complete", {
              chatId: parsedBody.data.chatId,
              runId,
              messageId: finalPersistedMessageId ?? assistantMessageId,
            });

            send({
              type: "done",
              messageId: finalPersistedMessageId ?? assistantMessageId,
              userMessageId:
                (result as { userMessageId?: string | null }).userMessageId ??
                undefined,
              response: finalMessage,
            });

            info("stream_closed", {
              chatId: parsedBody.data.chatId,
              runId,
              totalMs: Date.now() - requestStartedAt,
            });
            controller.close();
          } catch (error) {
            logError("chat_stream_failed", { error });

            // If no tokens were emitted, provide a fallback token so UI can render
            if (!firstTokenAt) {
              send({
                type: "token",
                content: "Failed to generate a response. Please try again.",
              });
            }

            send({ type: "status", message: "Failed to generate a response." });
            send({ type: "done" });

            info("stream_closed", {
              chatId: parsedBody.data.chatId,
              runId,
              totalMs: Date.now() - requestStartedAt,
            });
            controller.close();
          } finally {
            // Stream closure is handled immediately after the terminal event.
          }
        })().catch((error) => {
          logError("chat_stream_failed", { error });
          try {
            controller.close();
          } catch {}
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
    // Use unified error response helper for consistent payloads
    logError("chat_route_error", { error });
    return toResponse(error instanceof Error ? new ApiError(error.message, 500) : error);
  }
}
