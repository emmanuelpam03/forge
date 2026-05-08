import "server-only";

import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import prisma from "@/lib/prisma";
import {
  createGeminiModel,
  extractTextFromModelChunk,
  getChatModelConfig,
  type ModelOverride,
} from "@/ai/models";
import { buildChatMessages } from "@/ai/prompts/router.ts";
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
  deriveLegacyIntentFromStructured,
  type QueryIntentClassification,
} from "@/ai/graph/classification.ts";
import { buildIntentClassificationMessage } from "@/ai/prompts/intent.ts";
import { shouldUseHumanizationMode } from "@/ai/prompts/humanization.prompt";
import { sanitizeAssistantOutput } from "@/ai/graph/output-sanitizer";
import type { ChatGraphState } from "@/ai/graph/state";
import type { StreamEvent } from "@/ai/graph/stream";
import { DEFAULT_PROMPT_BEHAVIOR_CONTROLS } from "@/ai/prompts/control.types";

export function normalizeAssistantResponseText(text: string): string {
  // Simplified normalization: avoid aggressive token merging which can
  // introduce/remove intra-word spaces. Preserve original spacing and
  // only perform minimal cleanup (normalize newlines, collapse repeated
  // spaces, and ensure punctuation spacing).
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?])(\S)/g, "$1 $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function humanizeAssistantResponseText(
  text: string,
  shouldHumanize: boolean,
): string {
  const normalized = normalizeAssistantResponseText(text);

  if (!shouldHumanize) {
    return normalized;
  }

  const sanitized = sanitizeAssistantOutput(normalized);
  return sanitized || normalized;
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
    return { text: message, maxSentences: 5 };
  }

  if (toolName === "projectContextLookup") {
    return { query: message, maxResults: 5 };
  }

  return {};
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

const FORMATTING_BY_RESPONSE_MODE = {
  code: "stepwise",
  compare: "table-first",
} as const;

type DerivedFormattingProfile =
  | (typeof FORMATTING_BY_RESPONSE_MODE)[keyof typeof FORMATTING_BY_RESPONSE_MODE]
  | "auto";

function deriveFormattingProfile(
  responseMode?: string | null,
): DerivedFormattingProfile {
  if (!responseMode) {
    return "auto";
  }

  return (
    FORMATTING_BY_RESPONSE_MODE[
      responseMode as keyof typeof FORMATTING_BY_RESPONSE_MODE
    ] ?? "auto"
  );
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
  const override: ModelOverride = {
    model: state.modelUsed || undefined,
    provider:
      (state.provider as "google-genai" | "ollama" | undefined) || undefined,
  };
  const model = createGeminiModel(override);
  const modelConfig = getChatModelConfig(override);
  const messages = buildChatMessages(state);
  const startedAt = Date.now();
  let assistantMessage = "";
  // Prefer streaming from the model when available. Emit tokens as they
  // arrive via the run-scoped event emitter so upstream code can forward
  // them to clients immediately. Do NOT fall back to `invoke()` here —
  // streaming is required for low TTFT.
  try {
    let tokenStream: AsyncIterable<unknown>;

    const modelConfigInTry = modelConfig;
    if (modelConfigInTry.provider === "ollama") {
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

  assistantMessage = humanizeAssistantResponseText(
    assistantMessage,
    shouldUseHumanizationMode(state.userMessage),
  );

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
    userMessageId: createdUserMessageId,
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

/**
 * Classify user intent
 * Input: userMessage + context
 * Output: intent field
 */
export async function classifyIntentNode(state: ChatGraphState) {
  try {
    const model = createGeminiModel();
    const classificationPrompt = buildIntentClassificationMessage(
      state.userMessage,
    );

    let classifiedIntent = null;
    let structuredIntent = null;
    let taskCategory = state.taskCategory ?? "general";
    try {
      const response = await model.invoke([
        new HumanMessage(classificationPrompt),
      ]);
      const parsed = parseClassificationText(toTextContent(response.content));

      structuredIntent = parsed.structured ?? null;
      classifiedIntent = deriveLegacyIntentFromStructured(
        structuredIntent ??
          parsed.structured ?? {
            intent: "casual conversation",
            difficulty: "medium",
            verbosity: "balanced",
            audienceLevel: "intermediate",
            toolUsage: [],
            responseMode: "chat",
            confidence: "low",
            memoryRelevance: false,
            reasoningDepth: "standard",
            multiIntent: [],
          },
      );

      taskCategory =
        structuredIntent?.intent === "coding" ||
        structuredIntent?.intent === "debugging" ||
        structuredIntent?.intent === "automation tasks"
          ? "coding"
          : structuredIntent?.intent === "planning"
            ? "planning"
            : structuredIntent?.intent === "teaching" ||
                structuredIntent?.intent === "analysis" ||
                structuredIntent?.intent === "comparison" ||
                structuredIntent?.intent === "summarization"
              ? "reasoning"
              : structuredIntent?.intent === "architecture" ||
                  structuredIntent?.intent === "system design"
                ? "explanation"
                : "general";
    } catch (classificationError) {
      console.warn(
        "Intent classification model call failed:",
        classificationError,
      );
    }

    const queryIntent = deriveQueryIntentFromClassification(classifiedIntent);
    const requestedPersona =
      state.promptBehavior?.persona ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS.persona;
    const promptBehavior = structuredIntent
      ? {
          responseMode: structuredIntent.responseMode,
          verbosity: structuredIntent.verbosity,
          audience: structuredIntent.audienceLevel,
          teachingDepth: structuredIntent.reasoningDepth,
          formatting: deriveFormattingProfile(structuredIntent.responseMode),
          persona: requestedPersona,
        }
      : state.promptBehavior;

    console.info(
      JSON.stringify({
        event: "intent.classified",
        chatId: hashIdentifierForLogging(state.chatId),
        runId: hashIdentifierForLogging(state.runId),
        queryIntent,
        classifiedIntent,
        structuredIntent,
        taskCategory,
        message: state.userMessage,
      }),
    );

    console.info(
      JSON.stringify({
        event: "promptRouting.decision",
        chatId: hashIdentifierForLogging(state.chatId),
        runId: hashIdentifierForLogging(state.runId),
        taskCategory,
        specialistPrompt:
          taskCategory === "coding"
            ? "coding"
            : taskCategory === "reasoning" || taskCategory === "explanation"
              ? "reasoning"
              : taskCategory === "planning" || taskCategory === "trading"
                ? "planning"
                : "system",
      }),
    );

    return {
      intent: classifiedIntent?.intent ?? queryIntent.type,
      queryIntent,
      classifiedIntent,
      structuredIntent,
      taskCategory,
      responseMode: structuredIntent?.responseMode ?? "auto",
      verbosityLevel: structuredIntent?.verbosity ?? "auto",
      audienceLevel: structuredIntent?.audienceLevel ?? "auto",
      teachingDepth: structuredIntent?.reasoningDepth ?? "auto",
      formattingProfile: deriveFormattingProfile(
        structuredIntent?.responseMode,
      ),
      promptBehavior,
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
      structuredIntent: null,
      taskCategory: "general",
      responseMode: "auto",
      verbosityLevel: "auto",
      audienceLevel: "auto",
      teachingDepth: "auto",
      formattingProfile: "auto",
      promptBehavior: undefined,
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
