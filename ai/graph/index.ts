import "server-only";

import { END, START, StateGraph } from "@langchain/langgraph";
import { info, error as logError } from "@/lib/logger";
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
  generateTitleNode,
  setGraphStreamEventEmitter,
} from "@/ai/graph/nodes";
import { createForgeTools } from "@/ai/tools";
import type { StreamEvent } from "./stream";
export type { StreamEvent } from "./stream";

type GraphStateWithDiagnostics = ReturnType<typeof createChatGraphSeed> & {
  __preResponseMs?: number;
};

async function runGraphPreResponse(
  input: ChatGraphInput,
  onEvent?: (event: StreamEvent) => void,
  requestStartedAt?: number,
) {
  const state = createChatGraphSeed(input) as GraphStateWithDiagnostics;
  const _preResponseStart = Date.now();
  state._timings = {
    ...(state._timings ?? {}),
    requestStartedAt,
    preResponseStartedAt: _preResponseStart,
  };

  // Register a run-scoped emitter so nodes can call `emitStatus` without
  // changing their LangGraph-compatible signatures.
  setGraphStreamEventEmitter(onEvent);

  const [contextResult, classificationResult] = await Promise.all([
    loadContextNode(state),
    classifyIntentNode(state),
  ]);

  // Background/live enrichment disabled in chat-history-only mode
  const liveContextEnrichmentPromise = Promise.resolve(null);

  Object.assign(state, contextResult);
  Object.assign(state, classificationResult);
  Object.assign(state, await planTaskNode(state));
  Object.assign(state, await toolRouterNodeImpl(state, onEvent));
  Object.assign(state, await synthesizeEvidenceNode(state));

  const liveContextEnrichment = await liveContextEnrichmentPromise;
  if (liveContextEnrichment) {
    Object.assign(state, liveContextEnrichment);
  }

  // Clear the run-scoped emitter after all pre-response events are done.
  setGraphStreamEventEmitter(undefined);

  // annotate duration for diagnostics
  const preResponseCompletedAt = Date.now();
  state.__preResponseMs = preResponseCompletedAt - _preResponseStart;
  state._timings = {
    ...(state._timings ?? {}),
    preResponseCompletedAt,
    preResponseMs: state.__preResponseMs,
  };

  return state;
}

const graphBuilder = new StateGraph(chatGraphState)
  .addNode(CHAT_GRAPH_NODES.loadContext, loadContextNode)
  .addNode(CHAT_GRAPH_NODES.classifyIntent, classifyIntentNode)
  .addNode(CHAT_GRAPH_NODES.planTask, planTaskNode)
  .addNode(CHAT_GRAPH_NODES.toolRouter, toolRouterNode)
  .addNode(CHAT_GRAPH_NODES.synthesizeEvidence, synthesizeEvidenceNode)
  .addNode(CHAT_GRAPH_NODES.generateResponse, generateResponseNode)
  .addNode(CHAT_GRAPH_NODES.saveMessages, saveMessagesNode)
  .addNode(CHAT_GRAPH_NODES.generateTitle, generateTitleNode);

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
  const requestStart = Date.now();
  const state = await runGraphPreResponse(input, onEvent, requestStart);
  const preResponseEnd = Date.now();
  const preResponseMs = preResponseEnd - requestStart;
  
  const startedAt = Date.now();
  state._timings = {
    ...(state._timings ?? {}),
    requestStartedAt: requestStart,
    preResponseCompletedAt: preResponseEnd,
    modelStreamStartedAt: startedAt,
    preResponseMs,
  };
  info("pre_response_ms", {
    chatId: input.chatId,
    runId: input.runId,
    preResponseMs: state.__preResponseMs ?? null,
    actualPreResponseMs: preResponseMs,
  });
  info("model_stream_start", {
    chatId: input.chatId,
    runId: input.runId,
    timeUntilStreamMs: preResponseMs,
  });

  let assistantMessage = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let firstTokenAt: number | null = null;

  try {
    onEvent?.({ type: "status", message: "Generating response..." });

    setGraphStreamEventEmitter((event) => {
      if (event.type === "token" && firstTokenAt === null) {
        firstTokenAt = Date.now();
        const ttftMs = firstTokenAt - startedAt;
        const totalPreStreamMs = firstTokenAt - requestStart;
        state._timings = {
          ...(state._timings ?? {}),
          firstTokenAt,
          preResponseToFirstTokenMs: totalPreStreamMs - preResponseMs,
        };
        info("first_token_sent", {
          chatId: input.chatId,
          runId: input.runId,
          ttftMs,
          preResponseMs: state.__preResponseMs,
          totalPreStreamMs,
          reflectionScore: state.reflectionReport?.score ?? null,
        });
      }

      onEvent?.(event);
    });

    const generatedResponse = await generateResponseNode({
      ...state,
      assistantMessage: "",
    });

    assistantMessage = generatedResponse.assistantMessage;
    inputTokens = generatedResponse.inputTokens;
    outputTokens = generatedResponse.outputTokens;

    if (!assistantMessage.trim()) {
      assistantMessage =
        "I encountered an issue generating a response. Please try again or rephrase your question.";
      onEvent?.({ type: "token", content: assistantMessage });
    }

    const endedAt = Date.now();
    const totalStreamMs = endedAt - startedAt;
    const totalMs = endedAt - requestStart;
    state._timings = {
      ...(state._timings ?? {}),
      streamCompletedAt: endedAt,
      requestCompletedAt: endedAt,
      streamDurationMs: totalStreamMs,
      totalLatencyMs: totalMs,
      preResponseMs,
    };
    
    info("stream_closed", {
      chatId: input.chatId,
      runId: input.runId,
      streamDurationMs: totalStreamMs,
      ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
      totalLatencyMs: totalMs,
    });
    info("stream_completed", {
      chatId: input.chatId,
      runId: input.runId,
      durationMs: totalStreamMs,
      ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
      totalRequestMs: totalMs,
    });
    info("graph_complete", {
      chatId: input.chatId,
      runId: input.runId,
      durationMs: totalStreamMs,
      latencyBreakdown: {
        preResponse: preResponseMs,
        modelStream: totalStreamMs,
        total: totalMs,
      },
    });
  } catch (error) {
    throw error;
  } finally {
    setGraphStreamEventEmitter(undefined);
  }

  Object.assign(state, {
    assistantMessage,
    modelUsed: input.model ?? state.modelUsed ?? "",
    provider: "openrouter",
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  });

  // Run persistence and post-processing in the background so the stream can
  // complete immediately after the model finishes.
  const saveStart = Date.now();
  try {
    // Queue message persistence (returns immediately with pre-allocated IDs)
    const saveResult = await saveMessagesNode(state);
    Object.assign(state, saveResult);
    const saveEndMs = Date.now() - saveStart;
    info("save_messages_queued", {
      chatId: input.chatId,
      runId: input.runId,
      queueTimeMs: saveEndMs,
    });
  } catch (error) {
    logError("save_messages_failed", { chatId: input.chatId, error });
  }

  // Queue title generation in background (non-blocking)
  const titleStart = Date.now();
  try {
    const titleResult = await generateTitleNode(state);
    Object.assign(state, titleResult);
    const titleEndMs = Date.now() - titleStart;
    info("generate_title_queued", {
      chatId: input.chatId,
      runId: input.runId,
      queueTimeMs: titleEndMs,
    });
  } catch (error) {
    logError("generate_title_failed", { chatId: input.chatId, error });
  }

  // Memory extraction disabled in chat-history-only mode.

  return state;
}
