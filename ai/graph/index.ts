import "server-only";

import { END, START, StateGraph } from "@langchain/langgraph";
import { type BaseMessage } from "@langchain/core/messages";
import prisma from "@/lib/prisma";
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
  extractMemoryNode,
  setGraphStreamEventEmitter,
} from "@/ai/graph/nodes";
import { createGeminiModel } from "@/ai/models";
import { buildChatMessages } from "@/ai/prompts/router";
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

async function runGraphPreResponse(
  input: ChatGraphInput,
  onEvent?: (event: StreamEvent) => void,
) {
  const state = createChatGraphSeed(input);

  // Register a run-scoped emitter so nodes can call `emitStatus` without
  // changing their LangGraph-compatible signatures.
  setGraphStreamEventEmitter(onEvent);

  Object.assign(state, await loadContextNode(state));
  Object.assign(state, await classifyIntentNode(state));
  Object.assign(state, await planTaskNode(state));
  Object.assign(state, await toolRouterNodeImpl(state));
  Object.assign(state, await synthesizeEvidenceNode(state));

  // Clear the run-scoped emitter to avoid cross-run leakage.
  setGraphStreamEventEmitter(undefined);

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

  const model = createGeminiModel();
  const messages = buildChatMessages(state);
  const startedAt = Date.now();

  let assistantMessage = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    onEvent?.({ type: "status", message: "Writing response..." });
    const stream = await model.stream(messages as BaseMessage[]);

    for await (const chunk of stream as AsyncIterable<unknown>) {
      const text = toTextContent(
        (chunk as { content?: unknown })?.content ?? chunk,
      );
      if (!text) {
        continue;
      }

      assistantMessage += text;
      onEvent?.({ type: "token", content: text });
    }
  } catch (error) {
    throw error;
  }
  // Stream validation: log if response is empty
  if (!assistantMessage.trim()) {
    console.warn(
      `Stream validation: Empty response after streaming. Chat: ${input.chatId}, Intent: ${state.intent}`,
    );
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
    modelUsed: "gemini",
    provider: "google-genai",
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  });

  // Post-stream step 1: Save messages to database
  try {
    const saveResult = await saveMessagesNode(state);
    Object.assign(state, saveResult);
  } catch (error) {
    console.error(`Failed to save messages for chat ${input.chatId}:`, error);
    // Continue - don't block title generation or memory extraction
  }

  // Run post-processing in background so the stream can complete immediately.
  void (async () => {
    // Post-stream step 2: Generate and persist chat title
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
      console.error(
        `Failed to generate/persist title for chat ${input.chatId}:`,
        error,
      );
    }

    // Post-stream step 3: Extract and store user memory
    try {
      const memoryResult = await extractMemoryNode(state);
      Object.assign(state, memoryResult);
    } catch (error) {
      console.error(
        `Failed to extract memory for chat ${input.chatId}:`,
        error,
      );
    }
  })();

  return state;
}
