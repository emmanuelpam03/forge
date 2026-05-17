import "server-only";

import { END, START, StateGraph } from "@langchain/langgraph";
import prisma from "@/lib/prisma";
import { hashIdentifierForLogging } from "@/lib/logging";
import { info, warn, error as logError, debug } from "@/lib/logger";
import {
  createChatGraphSeed,
  chatGraphState,
  type ChatGraphInput,
} from "@/ai/graph/state";
import { CHAT_GRAPH_EDGE_LIST, CHAT_GRAPH_NODES } from "@/ai/graph/edges";
import {
  generateResponseNode,
  loadContextNode,
  saveMessagesNode,
  classifyIntentNode,
  planTaskNode,
  toolRouterNode,
  toolRouterNodeImpl,
  synthesizeEvidenceNode,
  reflectionNode,
  generateTitleNode,
  extractMemoryNode,
  setGraphStreamEventEmitter,
  normalizeAssistantResponseText,
} from "@/ai/graph/nodes";
import { buildChatMessages } from "@/ai/prompts/router.ts";
import type { StreamEvent } from "./stream";
export type { StreamEvent } from "./stream";

function toTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object") {
          const textPart = part as { text?: string; content?: string };
          return textPart.text ?? textPart.content ?? "";
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

type GraphStateWithDiagnostics = ReturnType<typeof createChatGraphSeed> & {
  __preResponseMs?: number;
};

async function runGraphPreResponse(
  input: ChatGraphInput,
  onEvent?: (event: StreamEvent) => void,
) {
  const state = createChatGraphSeed(input) as GraphStateWithDiagnostics;
  const _preResponseStart = Date.now();

  // Register a run-scoped emitter so nodes can call `emitStatus` without
  // changing their LangGraph-compatible signatures.
  setGraphStreamEventEmitter(onEvent);

  const [contextResult, classificationResult] = await Promise.all([
    loadContextNode(state),
    classifyIntentNode(state),
  ]);

  Object.assign(state, contextResult);
  Object.assign(state, classificationResult);
  Object.assign(state, await planTaskNode(state));
  Object.assign(state, await toolRouterNodeImpl(state, onEvent));
  Object.assign(state, await synthesizeEvidenceNode(state));
  Object.assign(state, await reflectionNode(state));

  // Clear the run-scoped emitter after all pre-response events are done.
  setGraphStreamEventEmitter(undefined);

  // annotate duration for diagnostics
  state.__preResponseMs = Date.now() - _preResponseStart;

  return state;
}

const graphBuilder = new StateGraph(chatGraphState)
  .addNode(CHAT_GRAPH_NODES.loadContext, loadContextNode)
  .addNode(CHAT_GRAPH_NODES.classifyIntent, classifyIntentNode)
  .addNode(CHAT_GRAPH_NODES.planTask, planTaskNode)
  .addNode(CHAT_GRAPH_NODES.toolRouter, toolRouterNode)
  .addNode(CHAT_GRAPH_NODES.synthesizeEvidence, synthesizeEvidenceNode)
  .addNode(CHAT_GRAPH_NODES.reflectOnResponse, reflectionNode)
  .addNode(CHAT_GRAPH_NODES.generateResponse, generateResponseNode)
  .addNode(CHAT_GRAPH_NODES.saveMessages, saveMessagesNode)
  .addNode(CHAT_GRAPH_NODES.generateTitle, generateTitleNode)
  .addNode(CHAT_GRAPH_NODES.extractMemory, extractMemoryNode);

for (const [source, target] of CHAT_GRAPH_EDGE_LIST) {
  graphBuilder.addEdge(
    source === "__start__" ? START : source,
    target === "__end__" ? END : target,
  );
}

export const chatGraph = graphBuilder.compile();

export async function runChatGraph(input: ChatGraphInput) {
  return chatGraph.invoke(createChatGraphSeed(input));
}

export async function runChatGraphStream(
  input: ChatGraphInput,
  onEvent?: (event: StreamEvent) => void,
) {
  const state = await runGraphPreResponse(input, onEvent);

  const messages = buildChatMessages(state);
  const startedAt = Date.now();
  info("pre_response_ms", {
    chatId: input.chatId,
    runId: input.runId,
    preResponseMs: state.__preResponseMs ?? null,
  });
  info("model_stream_start", {
    chatId: input.chatId,
    runId: input.runId,
    timestamp: Date.now(),
  });

  let assistantMessage = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    onEvent?.({ type: "status", message: "Generating response..." });
    let firstTokenAt: number | null = null;
    const reflectedMessage = state.assistantMessage?.trim();

    if (reflectedMessage) {
      const tokens = reflectedMessage.split(/(\s+)/);

      for (const token of tokens) {
        if (!token) {
          continue;
        }

        if (firstTokenAt === null) {
          firstTokenAt = Date.now();
          info("first_token_sent", {
            chatId: input.chatId,
            runId: input.runId,
            ttftMs: firstTokenAt - startedAt,
            reflectionScore: state.reflectionReport?.score ?? null,
          });
        }

        assistantMessage += token;
        onEvent?.({ type: "token", content: token });
      }
    }

    if (!assistantMessage.trim()) {
      assistantMessage =
        "I encountered an issue generating a response. Please try again or rephrase your question.";
      onEvent?.({ type: "token", content: assistantMessage });
    }

    const endedAt = Date.now();
    info("stream_closed", {
      chatId: input.chatId,
      runId: input.runId,
      durationMs: endedAt - startedAt,
      ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
    });
    info("stream_completed", {
      chatId: input.chatId,
      runId: input.runId,
      durationMs: endedAt - startedAt,
      ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
    });
    info("graph_complete", {
      chatId: input.chatId,
      runId: input.runId,
      durationMs: endedAt - startedAt,
    });
  } catch (error) {
    throw error;
  }

  assistantMessage = await normalizeAssistantResponseText(assistantMessage);

  // Stream validation: log if response is empty
  if (!assistantMessage.trim()) {
    warn("stream_validation_empty_response", {
      chatId: input.chatId,
      intent: state.intent,
    });
  }

  outputTokens = estimateTokens(assistantMessage);
  inputTokens = estimateTokens(
    messages
      .map((message) =>
        toTextContent((message as { content?: unknown }).content),
      )
      .join("\n"),
  );

  Object.assign(state, {
    assistantMessage,
    modelUsed: input.model ?? state.modelUsed ?? "",
    provider:
      (input.provider as "google-genai" | "ollama" | undefined) ??
      state.provider ??
      "",
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  });

  // Run persistence and post-processing in the background so the stream can
  // complete immediately after the model finishes.
  try {
    // Persist messages synchronously so callers (API routes) receive
    // persisted IDs in their final 'done' event.
    const saveResult = await saveMessagesNode(state);
    Object.assign(state, saveResult);
  } catch (error) {
    logError("save_messages_failed", { chatId: input.chatId, error });
  }

  // Run non-critical post-processing in background to avoid delaying the
  // response to clients (title generation and memory extraction).
  void (async () => {
    try {
      const titleResult = await generateTitleNode(state);
      Object.assign(state, titleResult);
      if (titleResult.generatedTitle) {
        await prisma.chat.update({
          where: { id: state.chatId },
          data: { title: titleResult.generatedTitle },
        });
      }
      } catch (error) {
      logError("generate_title_failed", { chatId: input.chatId, error });
    }

    try {
      const memoryResult = await extractMemoryNode(state);
      Object.assign(state, memoryResult);
    } catch (error) {
      logError("extract_memory_failed", { chatId: input.chatId, error });
    }
  })();

  return state;
}
