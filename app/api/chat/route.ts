import { NextRequest } from "next/server";
import { z } from "zod";
import { runChatGraphStream } from "@/ai/graph";
import { createGeminiModel } from "@/ai/models";
import { HumanMessage } from "@langchain/core/messages";
import { buildFreshnessClassificationMessage } from "@/ai/prompts/router";
import { parseClassificationText } from "@/ai/graph/classification";
import { hashIdentifierForLogging } from "@/lib/logging";

export const runtime = "nodejs";

function toTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as { text?: string; content?: string };
          return p.text ?? p.content ?? "";
        }
        return "";
      })
      .join("");
  }
  if (content && typeof content === "object") {
    const c = content as { text?: string; content?: string };
    return c.text ?? c.content ?? "";
  }
  return String(content ?? "");
}

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

          // Run a quick classifier to detect whether the user message requires fresh data
          let forceTool: string | null = null;
          let classifiedIntent: {
            intent: "factual" | "reasoning" | "code" | "creative";
            requiresFreshData: boolean;
            confidence: "high" | "medium" | "low";
          } | null = null;
          try {
            const classifierModel = createGeminiModel();
            const classifierPrompt = buildFreshnessClassificationMessage(
              parsedBody.data.message,
            );
            const classifierResp = await classifierModel.invoke([
              new HumanMessage(classifierPrompt),
            ]);
            const classifierText = toTextContent(
              (classifierResp as { content?: unknown })?.content,
            );

            // Try parsing JSON from model output
            try {
              classifiedIntent = parseClassificationText(classifierText);

              if (
                classifiedIntent.intent === "factual" &&
                (classifiedIntent.requiresFreshData ||
                  classifiedIntent.confidence !== "high")
              ) {
                forceTool = "webSearch";
              }

              console.info(
                JSON.stringify({
                  event: "route.classifier.output",
                  chatId: hashIdentifierForLogging(parsedBody.data.chatId),
                  runId: hashIdentifierForLogging(runId),
                  classifier: classifiedIntent,
                  forceTool,
                }),
              );
            } catch (err) {
              // If parsing fails, default to no forced tool
              console.warn(
                "Freshness classifier parsing failed:",
                err,
                classifierText,
              );
              classifiedIntent = {
                intent: "factual",
                requiresFreshData: false,
                confidence: "low",
              };
            }
          } catch (err) {
            console.error("Freshness classifier failed:", err);
            classifiedIntent = {
              intent: "factual",
              requiresFreshData: false,
              confidence: "low",
            };
          }

          const result = await runChatGraphStream(
            {
              chatId: parsedBody.data.chatId,
              userMessage: parsedBody.data.message,
              runId,
              forceTool,
              classifiedIntent,
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
              JSON.stringify({
                error: "empty-response-after-streaming",
                chat_id: hashIdentifierForLogging(result.chatId),
                run_id: hashIdentifierForLogging(result.runId),
                intent: result.intent,
                tools_used: result.toolsUsed || [],
                streamed_length: assistantMessage.length,
              }),
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
