import "server-only";

import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import prisma from "@/lib/prisma";
import {
  createGeminiModel,
  extractTextFromModelChunk,
  getChatModelConfig,
} from "@/ai/models";
import {
  buildChatMessages,
  buildFreshnessClassificationMessage,
} from "@/ai/prompts/router";
import { TITLE_GENERATION_PROMPT } from "@/ai/prompts/title";
import { MEMORY_EXTRACTION_PROMPT } from "@/ai/prompts/memory";
import {
  loadContextForChat,
  maintainChatSummary,
  updateUserMemory,
} from "@/ai/context/engine";
import { createForgeTools } from "@/ai/tools";
import { hashIdentifierForLogging } from "@/lib/logging";
import {
  parseClassificationText,
  type QueryIntentClassification,
} from "@/ai/graph/classification";
import type { ChatGraphState } from "@/ai/graph/state";
import type { StreamEvent } from "@/ai/graph/stream";
import type { TaskSuggestion } from "@/types/tasks";

export function normalizeAssistantResponseText(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s+([.,;:!?])/g, "$1")
        .replace(/([.,;:!?])(\S)/g, "$1 $2")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/(\d)\s+(?=\d)/g, "$1")
        .trim(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

function looksFragmentedForRewrite(text: string): boolean {
  const words = text.match(/\b[\p{L}]+\b/gu) ?? [];
  const tinyWordCount = words.filter((word) => word.length <= 2).length;

  return (
    /\b[\p{L}]\s+[\p{L}]\s+[\p{L}]/u.test(text) ||
    /\b[\p{L}]{2,}\s+[\p{L}]{1,3}\s+[\p{L}]{2,}\b/u.test(text) ||
    tinyWordCount >= 6
  );
}

export async function refineAssistantResponseText(
  text: string,
): Promise<string> {
  const normalized = normalizeAssistantResponseText(text);

  if (!normalized || !looksFragmentedForRewrite(normalized)) {
    return normalized;
  }

  try {
    const model = createGeminiModel();
    const prompt = `Rewrite the text below so it is clean, readable, and professionally formatted.

Rules:
- Fix spelling, spacing, punctuation, capitalization, and obvious word breaks.
- Preserve the original meaning exactly.
- Preserve paragraph structure, headings, and list structure.
- Do not add new facts, examples, warnings, or conclusions.
- Return only the corrected text.

Text:
${normalized}`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const corrected = normalizeAssistantResponseText(
      toTextContent(response.content),
    );

    return corrected || normalized;
  } catch (error) {
    console.warn("Assistant response refinement failed:", error);
    return normalized;
  }
}

let graphStreamEventEmitter: ((event: StreamEvent) => void) | undefined;

export function setGraphStreamEventEmitter(
  onEvent?: (event: StreamEvent) => void,
) {
  graphStreamEventEmitter = onEvent;
}

function emitStatus(
  onEvent: ((event: StreamEvent) => void) | undefined,
  message: string,
) {
  (onEvent ?? graphStreamEventEmitter)?.({ type: "status", message });
}

function getToolStatusMessage(toolName: string): string {
  if (toolName === "webSearch") return "Searching...";
  if (toolName === "calculator") return "Calculating...";
  if (toolName === "currentDateTime") return "Checking time...";
  if (toolName === "summarizeText") return "Summarizing...";
  if (toolName === "projectContextLookup") return "Loading context...";
  return "Working...";
}

function looksLikeDateTimeQuery(message: string): boolean {
  return /\b(time|timezone|date|day of week|calendar)\b/i.test(message);
}

function looksLikeProjectLookupQuery(message: string): boolean {
  return /\b(project|workspace|this chat|this conversation|previous decision|prior decision|earlier discussion|history|what did we decide)\b/i.test(
    message,
  );
}

function deriveQueryIntentFromClassification(
  classifiedIntent: ChatGraphState["classifiedIntent"],
): QueryIntentClassification {
  if (!classifiedIntent) {
    return { needsTools: false, type: "knowledge" };
  }

  if (classifiedIntent.intent === "factual") {
    return classifiedIntent.requiresFreshData ||
      classifiedIntent.confidence !== "high"
      ? { needsTools: true, type: "real_time" }
      : { needsTools: false, type: "knowledge" };
  }

  return { needsTools: false, type: "knowledge" };
}

function resolveToolPlanForQueryIntent(
  state: ChatGraphState,
  queryIntent: QueryIntentClassification,
): string[] {
  const message = state.userMessage;

  if (!queryIntent.needsTools) {
    return [];
  }

  if (queryIntent.type === "real_time") {
    return looksLikeDateTimeQuery(message)
      ? ["currentDateTime"]
      : ["webSearch"];
  }

  return [];
}

function extractCalculatorExpression(message: string): string {
  const normalized = message
    .toLowerCase()
    .replace(
      /calculate|compute|solve|evaluate|figure out|what is|what's|what's the|what is the/g,
      " ",
    )
    .replace(/percent of/g, "% of")
    .replace(/([0-9.]+)\s*%\s*of\s*([0-9.]+)/g, "($1 / 100) * $2")
    .replace(/\bof\b/g, "*")
    .replace(/\bpercent\b/g, "/100")
    .replace(/[^0-9+\-*/%().^\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || message;
}

function buildToolArgs(
  toolName: string,
  state: ChatGraphState,
): Record<string, unknown> {
  const message = state.userMessage;

  if (toolName === "calculator") {
    return { expression: extractCalculatorExpression(message) };
  }

  if (toolName === "webSearch") {
    return { query: message, maxResults: 5 };
  }

  if (toolName === "currentDateTime") {
    if (/\btimezone\b/i.test(message)) {
      return { action: "timezone" };
    }

    if (/\bdate|day of week|today\b/i.test(message)) {
      return { action: "date" };
    }

    if (/\btime\b/i.test(message)) {
      return { action: "time" };
    }

    return { action: "now" };
  }

  if (toolName === "summarizeText") {
    return { text: message, maxSentences: 3 };
  }

  if (toolName === "projectContextLookup") {
    return { query: message, maxResults: 5 };
  }

  return {};
}

function hasOngoingIntent(message: string): boolean {
  return /\b(track|monitor|remind(?: me)?|notify me|alert me|follow up|follow-up|schedule|check in|keep an eye on)\b/i.test(
    message,
  );
}

function toTaskTypeValue(taskType: string): TaskSuggestion["taskType"] {
  if (taskType === "scheduled" || taskType === "conditional") {
    return taskType;
  }

  return "one-time";
}

function buildTaskSuggestion(
  candidate: Partial<TaskSuggestion> & { type?: string; taskType?: string },
): TaskSuggestion | null {
  if (
    typeof candidate.action !== "string" ||
    typeof candidate.description !== "string"
  ) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    type: "suggestion",
    action: candidate.action.trim(),
    description: candidate.description.trim(),
    taskType: toTaskTypeValue(candidate.taskType ?? "one-time"),
    scheduleSpec:
      typeof candidate.scheduleSpec === "string"
        ? candidate.scheduleSpec.trim() || null
        : null,
    conditionText:
      typeof candidate.conditionText === "string"
        ? candidate.conditionText.trim() || null
        : null,
    oneTimeAt:
      typeof candidate.oneTimeAt === "string"
        ? candidate.oneTimeAt.trim() || null
        : null,
  };
}

function inferTaskSuggestionFromMessage(
  message: string,
): Omit<TaskSuggestion, "id"> | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const hasActionIntent =
    /\b(remind me|set (a )?reminder|track|monitor|notify me|alert me|follow up|schedule|check)\b/i.test(
      trimmed,
    );

  if (!hasActionIntent) {
    return null;
  }

  const action = /\b(remind me|set (a )?reminder)\b/i.test(trimmed)
    ? "set_reminder"
    : /\b(track)\b/i.test(trimmed)
      ? "track_item"
      : /\b(monitor|check)\b/i.test(trimmed)
        ? "monitor_item"
        : /\b(notify me|alert me)\b/i.test(trimmed)
          ? "notify_user"
          : /\b(follow up)\b/i.test(trimmed)
            ? "follow_up"
            : "schedule_task";

  const conditionalMatch = trimmed.match(/\b(if|when)\b(.+)/i);
  const scheduleMatch = trimmed.match(
    /\b(every\s+[^,.!?]+|daily|weekly|monthly|each\s+[^,.!?]+)\b/i,
  );

  const taskType: TaskSuggestion["taskType"] = conditionalMatch
    ? "conditional"
    : scheduleMatch
      ? "scheduled"
      : "one-time";

  const description = trimmed.slice(0, 160);

  return {
    type: "suggestion",
    action,
    description,
    taskType,
    scheduleSpec:
      taskType === "scheduled" ? (scheduleMatch?.[0] ?? null) : null,
    conditionText:
      taskType === "conditional"
        ? `${conditionalMatch?.[1]}${conditionalMatch?.[2]}`.trim() || null
        : null,
    oneTimeAt: null,
  };
}

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
  return Math.ceil((text?.length ?? 0) / 4);
}

function parseJsonFromModelText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with tolerant extraction below.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // Continue with object-slice extraction below.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSlice);
    } catch {
      return null;
    }
  }

  return null;
}

function cleanFallbackAssistantText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(
      /^\s*(?:reasoning|planning|analysis|thoughts?|constraint check|refining|internal instructions?)\s*:\s*.*$/gim,
      "",
    )
    .replace(/^\s*(?:system|assistant|user)\s*:\s*/gim, "")
    .replace(/^\s*[-*>#]+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTaskSuggestions(
  parsedEnvelope: {
    suggestions?: unknown;
    suggestion?: unknown;
  } | null,
): TaskSuggestion[] {
  const parsedSuggestions = Array.isArray(parsedEnvelope?.suggestions)
    ? parsedEnvelope.suggestions
    : parsedEnvelope?.suggestion
      ? [parsedEnvelope.suggestion]
      : [];

  return parsedSuggestions
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      return buildTaskSuggestion(
        item as Partial<TaskSuggestion> & {
          type?: string;
          taskType?: string;
        },
      );
    })
    .filter((item): item is TaskSuggestion => item !== null);
}

export function parseStructuredAssistantOutput(text: string): {
  response: string;
  suggestions: TaskSuggestion[];
  parsedJson: boolean;
  rawText: string;
} {
  const parsedRaw = parseJsonFromModelText(text);
  const parsedEnvelope =
    parsedRaw && typeof parsedRaw === "object"
      ? (parsedRaw as {
          response?: unknown;
          suggestions?: unknown;
          suggestion?: unknown;
        })
      : null;

  const responseText =
    typeof parsedEnvelope?.response === "string"
      ? parsedEnvelope.response.trim()
      : "";

  const cleanedResponse = responseText || cleanFallbackAssistantText(text);

  return {
    response: cleanedResponse,
    suggestions: normalizeTaskSuggestions(parsedEnvelope),
    parsedJson: parsedEnvelope !== null,
    rawText: text,
  };
}

/**
 * Checks if text looks like a valid numeric expression for the calculator tool.
 * The calculator needs expressions like "100 * 0.15", not prose like "Web search result: ..."
 * This is needed for multi-sequential tool chaining where intermediate results are prose.
 */
export async function loadContextNode(state: ChatGraphState) {
  emitStatus(undefined, "Loading context...");
  const selectedContext = await loadContextForChat(
    state.chatId,
    state.parentMessageId ?? null,
  );

  // Derive memorySummary from selectedContext to indicate if context is available
  // Prioritize: projectContext > userMemory > chatSummary
  const memorySummary =
    selectedContext.projectContext ||
    selectedContext.userMemory ||
    selectedContext.chatSummary ||
    null;

  return {
    selectedContext,
    contextBudgetTokens: selectedContext.budgetUsed,
    previousMessages: selectedContext.recentTurns,
    preferences: selectedContext.preferences,
    memorySummary,
  };
}

export async function generateResponseNode(state: ChatGraphState) {
  emitStatus(undefined, "Writing response...");
  function joinWithSpacing(
    prev: string,
    next: string,
  ): { combined: string; emitted: string } {
    if (!prev) return { combined: next, emitted: next };
    if (!next) return { combined: prev, emitted: "" };

    const prevLast = prev.slice(-1);
    const nextFirst = next.charAt(0);
    const needsSpace =
      (/[A-Za-z0-9\)\]]$/.test(prevLast) || /[.,:;!?]$/.test(prevLast)) &&
      /^[A-Za-z0-9\(\[]/.test(nextFirst);
    if (needsSpace) {
      return { combined: `${prev} ${next}`, emitted: ` ${next}` };
    }

    return { combined: `${prev}${next}`, emitted: next };
  }
  const model = createGeminiModel();
  const modelConfig = getChatModelConfig();
  const messages = buildChatMessages(state);
  const startedAt = Date.now();
  let assistantMessage = "";
  // Prefer streaming from the model when available. Emit tokens as they
  // arrive via the run-scoped event emitter so upstream code can forward
  // them to clients immediately. Do NOT fall back to `invoke()` here —
  // streaming is required for low TTFT.
  try {
    let tokenStream: AsyncIterable<unknown>;
    const modelConfig = getChatModelConfig();

    if (modelConfig.provider === "ollama") {
      // For Ollama, use the stream() method for real token streaming
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tokenStream = (model as any).stream(messages as BaseMessage[]);
    } else {
      // For Gemini, use native streaming
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tokenStream = (model as any).nativeStream(messages as BaseMessage[]);
    }

    let firstTokenAt: number | null = null;
    for await (const token of tokenStream) {
      const chunkText = extractTextFromModelChunk(token);
      if (!chunkText.trim()) {
        continue;
      }

      if (firstTokenAt === null) {
        firstTokenAt = Date.now();
        console.info("FIRST TOKEN SENT (generateResponseNode)", {
          chatId: hashIdentifierForLogging(state.chatId),
          runId: hashIdentifierForLogging(state.runId),
          ttftMs: firstTokenAt - startedAt,
        });
      }

      // Ensure we preserve a space between token boundaries when needed
      const { combined, emitted } = joinWithSpacing(
        assistantMessage,
        chunkText,
      );
      assistantMessage = combined;

      // Forward the (possibly prefixed) emitted chunk to stream listeners
      graphStreamEventEmitter?.({ type: "token", content: emitted });
    }

    const endedAt = Date.now();
    console.info("STREAM CLOSED (generateResponseNode)", {
      chatId: hashIdentifierForLogging(state.chatId),
      runId: hashIdentifierForLogging(state.runId),
      durationMs: endedAt - startedAt,
      ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
    });
  } catch (err) {
    console.error(
      `[CRITICAL] Streaming failed in generateResponseNode. Chat: ${state.chatId}, RunId: ${state.runId}`,
      err,
    );
  }

  // Validate response content extraction
  if (!assistantMessage) {
    console.error(
      `[CRITICAL] Model returned null/undefined content. Chat: ${state.chatId}, Intent: ${state.intent}, RunId: ${state.runId}`,
    );
  }

  // If response is empty but we have tool evidence, use it as fallback
  if (!assistantMessage && state.toolContext) {
    assistantMessage =
      "Based on the information I found:\n\n" + state.toolContext;
  }

  // If response still empty after all fallbacks, use explicit message
  if (!assistantMessage) {
    assistantMessage =
      "I encountered an issue generating a response. Please try again or rephrase your question.";
    console.error(
      JSON.stringify({
        error: "empty-response",
        chat_id: state.chatId,
        run_id: state.runId,
        intent: state.intent,
        tools_used: state.toolsUsed || [],
        has_tool_context: !!state.toolContext,
        evidence_bundles_count: state.evidenceBundles?.length ?? 0,
        message_count: state.previousMessages?.length ?? 0,
      }),
    );
  }

  // GUARANTEE: assistantMessage is always non-empty after fallbacks
  if (!assistantMessage || !assistantMessage.trim()) {
    throw new Error(
      `[CRITICAL] generateResponseNode returned empty message. Chat: ${state.chatId}, RunId: ${state.runId}`,
    );
  }

  assistantMessage = await refineAssistantResponseText(assistantMessage);

  const inputTokens = estimateTokens(
    messages
      .map((message) =>
        toTextContent((message as { content?: unknown }).content),
      )
      .join("\n"),
  );
  const outputTokens = estimateTokens(assistantMessage);

  return {
    assistantMessage,
    modelUsed: modelConfig.model,
    provider: modelConfig.provider,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  };
}

export async function saveMessagesNode(state: ChatGraphState) {
  const now = new Date();
  let persistedAssistantMessageId: string | null =
    state.assistantMessageId ?? null;
  let createdUserMessageId: string | null = null;

  await prisma.chat.upsert({
    where: { id: state.chatId },
    create: {
      id: state.chatId,
      title: state.generatedTitle?.trim() || "New Chat",
    },
    update: {},
  });
  // Avoid duplicating the user message when the database already contains
  // the edited user turn (edit flow). If the last previous message is a
  // user message with identical content, skip creating a new user row.
  const lastPrev = state.previousMessages?.[state.previousMessages.length - 1];
  const shouldCreateUser = !(
    lastPrev &&
    lastPrev.role === "user" &&
    lastPrev.content.trim() === state.userMessage.trim()
  );

  // Honor explicit skip flag for flows that already reference an existing user turn
  const willCreateUser = shouldCreateUser && !state.skipUserCreate;

  if (willCreateUser) {
    const userMessage = await prisma.message.create({
      data: {
        chatId: state.chatId,
        role: "user",
        content: state.userMessage,
        parentId: state.parentMessageId ?? null,
        branchId: state.branchId ?? undefined,
      },
    });
    createdUserMessageId = userMessage.id;
  }

  const assistantData = {
    chatId: state.chatId,
    role: "assistant" as const,
    content: state.assistantMessage,
    parentId: createdUserMessageId ?? state.parentMessageId ?? null,
    branchId: state.branchId ?? undefined,
    modelUsed: state.modelUsed || null,
    provider: state.provider || null,
    tokensInput: state.inputTokens || null,
    tokensOutput: state.outputTokens || null,
    latencyMs: state.latencyMs || null,
    runId: state.runId || null,
    traceId: state.traceId || null,
  };

  if (state.assistantMessageId) {
    const assistantMessage = await prisma.message.upsert({
      where: { id: state.assistantMessageId },
      create: {
        id: state.assistantMessageId,
        ...assistantData,
      },
      update: assistantData,
    });
    persistedAssistantMessageId = assistantMessage.id;
  } else {
    const assistantMessage = await prisma.message.create({
      data: assistantData,
    });
    persistedAssistantMessageId = assistantMessage.id;
  }

  // Persist generated title if available (only on first turn)
  const chatUpdateData: Record<string, unknown> = {
    lastMessageAt: now,
  };
  if (state.generatedTitle && state.previousMessages.length === 0) {
    chatUpdateData.title = state.generatedTitle;
  }

  await prisma.chat.update({
    where: { id: state.chatId },
    data: chatUpdateData,
  });

  await prisma.chatRunAnalytics
    .create({
      data: {
        chatId: state.chatId,
        modelUsed: state.modelUsed || null,
        provider: state.provider || null,
        latencyMs: state.latencyMs || null,
        tokensInput: state.inputTokens || null,
        tokensOutput: state.outputTokens || null,
        runId: state.runId || null,
        traceId: state.traceId || null,
        status: "completed",
      },
    })
    .catch((error) => {
      console.warn(`Failed to save chat analytics for ${state.chatId}:`, error);
    });

  // Maintain rolling chat summary in background so stream completion is not delayed.
  void maintainChatSummary(state.chatId).catch((err) => {
    console.warn(`Failed to maintain chat summary for ${state.chatId}:`, err);
  });

  return {
    traceId: state.traceId,
    assistantMessageId: persistedAssistantMessageId,
  };
}

/**
 * Phase 2 Nodes: Intent classification, tool execution, title generation, memory extraction
 */

/**
 * Plan which tools are needed
 * Input: userMessage + intent + context
 * Output: toolPlan + executionMode
 */
export async function planTaskNode(state: ChatGraphState) {
  try {
    const queryIntent =
      state.queryIntent ??
      deriveQueryIntentFromClassification(state.classifiedIntent);
    const forcedTool = state.forceTool ?? null;
    const toolsNeeded = forcedTool
      ? [forcedTool]
      : resolveToolPlanForQueryIntent(state, queryIntent);
    const sequential = false;
    const followUpNeeded = false;
    const followUpQuestion = "";

    let executionMode:
      | "none"
      | "single"
      | "multi-parallel"
      | "multi-sequential" = "none";
    if (toolsNeeded.length === 0) {
      executionMode = "none";
    } else if (toolsNeeded.length === 1) {
      executionMode = "single";
    } else if (sequential) {
      executionMode = "multi-sequential";
    } else {
      executionMode = "multi-parallel";
    }

    console.info(
      JSON.stringify({
        event: "toolRouting.decision",
        chatId: hashIdentifierForLogging(state.chatId),
        runId: hashIdentifierForLogging(state.runId),
        queryIntent,
        forcedTool,
        toolsNeeded,
        executionMode,
      }),
    );

    return {
      toolPlan: {
        intent: queryIntent.type,
        toolsNeeded,
        sequential,
        followUpNeeded,
        followUpQuestion,
      },
      executionMode,
      intent: queryIntent.type,
      queryIntent,
    };
  } catch (error) {
    console.error("Tool planning failed:", error);
    return {
      toolPlan: {
        intent: state.intent,
        toolsNeeded: [],
        sequential: false,
        followUpNeeded: false,
      },
      executionMode: "none",
      intent: state.intent || "knowledge",
      queryIntent:
        state.queryIntent ??
        deriveQueryIntentFromClassification(state.classifiedIntent),
    };
  }
}

/**
 * Execute tools based on the plan
 * Input: toolPlan + executionMode + userMessage
 * Output: toolsUsed + evidenceBundles
 */
export async function toolRouterNodeImpl(
  state: ChatGraphState,
  onEvent?: (event: StreamEvent) => void,
) {
  try {
    if (!state.toolPlan || state.toolPlan.toolsNeeded.length === 0) {
      return {
        toolsUsed: [],
        evidenceBundles: [],
      };
    }

    const tools = createForgeTools({ chatId: state.chatId });
    const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
    const evidenceBundles: Array<{
      tool: string;
      content: string;
      timestamp: string;
    }> = [];
    const toolsUsed = new Set<string>();
    let intermediateContext = state.toolContext;

    if (state.forceTool) {
      const forcedName = state.forceTool;
      const forcedTool = toolByName.get(forcedName);
      if (forcedTool) {
        try {
          emitStatus(onEvent, getToolStatusMessage(forcedName));
          const rawResult = await forcedTool.invoke(
            buildToolArgs(forcedName, state),
          );
          const toolResultText =
            typeof rawResult === "string"
              ? rawResult
              : JSON.stringify(rawResult, null, 2);

          toolsUsed.add(forcedName);
          evidenceBundles.push({
            tool: forcedName,
            content: toolResultText,
            timestamp: new Date().toISOString(),
          });

          // set toolContext to forced result for downstream nodes
          intermediateContext = toolResultText;

          return {
            toolsUsed: Array.from(toolsUsed),
            evidenceBundles,
            toolContext: intermediateContext,
          };
        } catch (err) {
          console.error(`Forced tool ${forcedName} failed:`, err);
          // fall through to normal processing (no forced output)
        }
      }
    }

    if (state.executionMode === "multi-parallel") {
      const parallelResults = await Promise.all(
        state.toolPlan.toolsNeeded.map(async (toolName) => {
          const tool = toolByName.get(toolName);
          if (!tool) return null;

          try {
            emitStatus(onEvent, getToolStatusMessage(toolName));
            const rawResult = await tool.invoke(buildToolArgs(toolName, state));
            const toolResultText =
              typeof rawResult === "string"
                ? rawResult
                : JSON.stringify(rawResult, null, 2);

            return {
              tool: toolName,
              content: toolResultText,
              timestamp: new Date().toISOString(),
            };
          } catch (err) {
            console.error(`Tool ${toolName} failed:`, err);
            return null;
          }
        }),
      );

      parallelResults.forEach((result) => {
        if (result) {
          toolsUsed.add(result.tool);
          evidenceBundles.push(result);
        }
      });

      return {
        toolsUsed: Array.from(toolsUsed),
        evidenceBundles,
        toolContext: intermediateContext,
      };
    }

    if (
      state.executionMode === "multi-sequential" ||
      state.executionMode === "single"
    ) {
      for (const toolName of state.toolPlan.toolsNeeded) {
        const tool = toolByName.get(toolName);
        if (!tool) continue;

        try {
          emitStatus(onEvent, getToolStatusMessage(toolName));
          const rawResult = await tool.invoke(buildToolArgs(toolName, state));
          const toolResultText =
            typeof rawResult === "string"
              ? rawResult
              : JSON.stringify(rawResult, null, 2);

          toolsUsed.add(toolName);
          evidenceBundles.push({
            tool: toolName,
            content: toolResultText,
            timestamp: new Date().toISOString(),
          });

          // Store result for potential use by next tool without mutating input state
          intermediateContext = toolResultText;
        } catch (err) {
          console.error(`Tool ${toolName} failed:`, err);
        }
      }

      return {
        toolsUsed: Array.from(toolsUsed),
        evidenceBundles,
        toolContext: intermediateContext,
      };
    }

    return {
      toolsUsed: Array.from(toolsUsed),
      evidenceBundles,
      toolContext: intermediateContext,
    };
  } catch (error) {
    console.error("Tool router failed:", error);
    return {
      toolsUsed: [],
      evidenceBundles: [],
    };
  }
}

// Wrapper with NodeAction-compatible signature. The graph builder expects a single-arg
// node action `(state) => Promise<...>`. Use this wrapper when registering the node.
export async function toolRouterNode(state: ChatGraphState) {
  return toolRouterNodeImpl(state);
}

/**
 * Synthesize evidence from tool execution
 * Input: evidenceBundles + toolsUsed
 * Output: toolContext (formatted evidence) + synthesisNote
 */
export async function synthesizeEvidenceNode(state: ChatGraphState) {
  try {
    if (state.evidenceBundles.length === 0) {
      return {
        toolContext: "",
        synthesisNote: "",
      };
    }

    emitStatus(undefined, "Analyzing results...");

    // Format evidence bundles into a clear context
    const contextLines = state.evidenceBundles.map(
      (bundle) => `## ${bundle.tool.toUpperCase()}\n${bundle.content}`,
    );

    const toolContext = contextLines.join("\n\n");

    // Determine synthesis note (confidence, freshness, any caveats)
    const hasFreshSearch = state.evidenceBundles.some(
      (b) => b.tool === "webSearch",
    );
    const synthesisNote = hasFreshSearch
      ? "Results include recent web search data."
      : "Results from local tools and project context.";

    return {
      toolContext,
      synthesisNote,
    };
  } catch (error) {
    console.error("Evidence synthesis failed:", error);
    return {
      toolContext: "",
      synthesisNote: "",
    };
  }
}

export async function suggestTaskNode(state: ChatGraphState) {
  try {
    const suggestions = generateSuggestions(
      state.userMessage,
      state.assistantMessage,
    );

    console.info(
      JSON.stringify({
        event: "suggestions.generated",
        chatId: hashIdentifierForLogging(state.chatId),
        runId: hashIdentifierForLogging(state.runId),
        count: suggestions.length,
        action: suggestions[0]?.action ?? null,
      }),
    );

    if (suggestions.length === 0) {
      return {
        suggestion: null,
        suggestions: [],
        suggestionResponse: "",
      };
    }

    return {
      suggestion: suggestions[0] ?? null,
      suggestions,
      suggestionResponse: "",
    };
  } catch (error) {
    console.error("Task suggestion generation failed:", error);
    return { suggestion: null, suggestions: [], suggestionResponse: "" };
  }
}

export function generateSuggestions(
  userQuery: string,
  response: string,
): TaskSuggestion[] {
  if (!userQuery || !response || !hasOngoingIntent(userQuery)) {
    return [];
  }

  const heuristicSuggestion = inferTaskSuggestionFromMessage(userQuery);
  if (!heuristicSuggestion) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      ...heuristicSuggestion,
    },
  ];
}

/**
 * Classify user intent
 * Input: userMessage + context
 * Output: intent field
 */
export async function classifyIntentNode(state: ChatGraphState) {
  try {
    const model = createGeminiModel();
    const classificationPrompt = buildFreshnessClassificationMessage(
      state.userMessage,
    );

    let classifiedIntent = null;
    try {
      const response = await model.invoke([
        new HumanMessage(classificationPrompt),
      ]);
      classifiedIntent = parseClassificationText(
        toTextContent(response.content),
      );
    } catch (classificationError) {
      console.warn(
        "Intent classification model call failed:",
        classificationError,
      );
    }

    const queryIntent = deriveQueryIntentFromClassification(classifiedIntent);

    console.info(
      JSON.stringify({
        event: "intent.classified",
        chatId: hashIdentifierForLogging(state.chatId),
        runId: hashIdentifierForLogging(state.runId),
        queryIntent,
        classifiedIntent,
        message: state.userMessage,
      }),
    );

    return {
      intent: classifiedIntent?.intent ?? queryIntent.type,
      queryIntent,
      classifiedIntent,
    };
  } catch (error) {
    console.error("Intent classification failed:", error);
    return {
      intent: "knowledge",
      queryIntent: {
        needsTools: false,
        type: "knowledge",
      },
      classifiedIntent: null,
    };
  }
}

/**
 * Generate chat title
 * Input: userMessage + assistantMessage + previousMessages.length
 * Output: generatedTitle field
 */
export async function generateTitleNode(state: ChatGraphState) {
  try {
    // Only generate title if chat has no messages (first exchange)
    if (state.previousMessages.length > 0) {
      return {
        generatedTitle: "",
      };
    }

    const model = createGeminiModel();
    const prompt = TITLE_GENERATION_PROMPT.replace(
      /"{USER_MESSAGE}"/g,
      state.userMessage,
    ).replace(/"{ASSISTANT_MESSAGE}"/g, state.assistantMessage);

    const response = await model.invoke([new HumanMessage(prompt)]);
    const generatedTitle = toTextContent(response.content)
      .toLowerCase()
      .trim()
      .replace(/^["']|["']$/g, "") // Remove quotes if model added them
      .replace(/[—–-].*$/, "")
      .replace(
        /\b(straight to the point|quick take|in brief|explained simply)\b.*$/i,
        "",
      )
      .replace(/\s{2,}/g, " ")
      .replace(/[^\p{L}\p{N}\s'-]/gu, "")
      .trim();

    return {
      generatedTitle,
    };
  } catch (error) {
    console.error("Title generation failed:", error);
    return {
      generatedTitle: "",
    };
  }
}

/**
 * Extract learning from interaction
 * Input: userMessage + assistantMessage + intent
 * Output: extractedMemory field
 */
export async function extractMemoryNode(state: ChatGraphState) {
  try {
    const model = createGeminiModel();
    const prompt = MEMORY_EXTRACTION_PROMPT.replace(
      /"{USER_MESSAGE}"/g,
      state.userMessage,
    )
      .replace(/"{ASSISTANT_MESSAGE}"/g, state.assistantMessage)
      .replace(/"{INTENT}"/g, state.intent || "");

    const response = await model.invoke([new HumanMessage(prompt)]);
    const extractedMemory = toTextContent(response.content)
      .trim()
      .replace(/^["']|["']$/g, "");

    // Phase 6: Update user memory with extracted fact (deduplicated & ranked)
    if (extractedMemory) {
      await updateUserMemory(extractedMemory).catch((err) => {
        console.warn("Failed to update user memory:", err);
        // Non-blocking - don't throw
      });
    }

    return {
      extractedMemory,
    };
  } catch (error) {
    console.error("Memory extraction failed:", error);
    return {
      extractedMemory: "",
    };
  }
}
