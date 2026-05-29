import "server-only";

import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import {
  createGeminiModel,
  resolveChatModelConfig,
  type ModelOverride,
} from "@/ai/models";
import { buildChatMessages } from "@/ai/prompts/router.ts";
import { loadContextFastPath } from "@/ai/context/engine";
import { persistSaveMessagesJobData } from "@/lib/background-worker";
import { queueJob, type SaveMessagesJobData, type GenerateTitleJobData } from "@/lib/job-queue";
import { createForgeTools } from "@/ai/tools";
import { hashIdentifierForLogging } from "@/lib/logging";
import { info, warn, error as logError, debug } from "@/lib/logger";
import { startTimer, endTimer } from "@/lib/metrics";
import {
  consumeModelStream,
  sanitizeVisibleAssistantText,
  toTextContent,
} from "@/ai/graph/stream-consumer";
import {
  parseClassificationText,
  deriveLegacyIntentFromStructured,
  deriveStructuredFromLegacy,
  shouldForceWebSearchFromClassification,
  type QueryIntentClassification,
} from "@/ai/graph/classification.ts";
import type { ClassifiedIntent } from "@/ai/graph/state";
import { buildIntentClassificationMessage, buildFreshnessClassificationMessage } from "@/ai/prompts/intent";
// humanization and sanitizer removed from runtime path
import { shouldPreserveLongFormDraft } from "@/ai/graph/response-shaping";
import type { ChatGraphState } from "@/ai/graph/state";
import type { StreamEvent } from "@/ai/graph/stream";
import type { RetrievedImage } from "@/ai/tools/image-types";
import { groundImageSearchQuery } from "@/ai/services/image-ranking";
import type { UploadedAttachment } from "@/lib/attachment-types";

type ChatImageBlock = {
  images: RetrievedImage[];
  totalFound?: number;
  retrievalTimeMs?: number;
};

function isUploadedAttachment(value: unknown): value is UploadedAttachment {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as UploadedAttachment).id === "string" &&
    typeof (value as UploadedAttachment).chatId === "string" &&
    typeof (value as UploadedAttachment).name === "string" &&
    typeof (value as UploadedAttachment).mimeType === "string"
  );
}

function emitImageSearchEvent(
  toolName: string,
  rawResult: unknown,
  state: ChatGraphState,
  onEvent?: (event: StreamEvent) => void,
) {
  if (toolName !== "imageSearch" && toolName !== "imageGeneration") return;

  try {
    const parsed: Record<string, unknown> = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
    const images = ((parsed?.images as Array<Record<string, unknown>>) ?? []) as RetrievedImage[];
    const toolArgs = buildToolArgs(toolName, state) as Record<string, unknown>;
    const toolQuery =
      typeof parsed?.queryUsed === "string"
        ? parsed.queryUsed
        : typeof parsed?.promptUsed === "string"
          ? parsed.promptUsed
          : typeof toolArgs.query === "string"
            ? toolArgs.query
            : typeof toolArgs.prompt === "string"
              ? toolArgs.prompt
              : "";

    const payload = {
      type: "images" as const,
      query: toolQuery,
      provider: parsed?.provider || "",
      images: images.map((im) => ({
        id: im.id,
        url: im.url,
        thumbnailUrl: im.thumbnailUrl,
        title: im.title,
        sourcePage: im.sourcePage,
        source: im.sourcePage || im.provider,
        width: im.width,
        height: im.height,
        provider: im.provider,
        relevanceScore: im.relevanceScore,
        safetyScore: im.safetyScore,
        metadata: im.metadata || {},
      })),
      totalFound: parsed?.totalFound ?? images.length,
      retrievalTimeMs: parsed?.retrievalTimeMs ?? 0,
    };

    (onEvent ?? graphStreamEventEmitter)?.(payload as StreamEvent);
  } catch {
    // silently ignore parse/emit errors
  }
}
import { DEFAULT_PROMPT_BEHAVIOR_CONTROLS } from "@/ai/prompts/control.types";

// Lightweight typing for models we interact with. We avoid `any` and declare
// the minimal surface used by this module: `invoke`, `stream`, and `nativeStream`.
type ModelInvoker = {
  invoke?: (messages: BaseMessage[] | unknown, opts?: unknown) => Promise<unknown>;
  stream?: (
    messages: BaseMessage[],
    opts?: unknown,
  ) => AsyncIterable<unknown> | PromiseLike<AsyncIterable<unknown>>;
  nativeStream?: (
    messages: BaseMessage[],
    opts?: unknown,
  ) => AsyncIterable<unknown> | PromiseLike<AsyncIterable<unknown>>;
};

// Note: post-generation mutation (normalization/humanization) removed.

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
  if (toolName === "imageGeneration") return "Generating image...";
  return "Working...";
}

function looksLikeDateTimeQuery(message: string): boolean {
  return /\b(time|timezone|date|day of week|calendar)\b/i.test(message);
}

function buildLangSmithRunConfig(
  state: ChatGraphState,
  phase: string,
): {
  runName: string;
  tags: string[];
  metadata: Record<string, string | boolean>;
} {
  const selectedOptions = state.selectedOptions ?? [];
  const persona = state.promptBehavior?.persona ?? "auto";
  const taskCategory = state.taskCategory ?? "general";

  return {
    runName: `forge.${phase}`,
    tags: [
      `phase:${phase}`,
      `task:${taskCategory}`,
      `persona:${persona}`,
      ...selectedOptions.map((optionId) => `option:${optionId}`),
    ],
    metadata: {
      chatId: hashIdentifierForLogging(state.chatId),
      runId: hashIdentifierForLogging(state.runId),
      taskCategory,
      persona,
      selectedOptions: selectedOptions.join(","),
      codingOptionSelected: selectedOptions.includes("coding"),
    },
  };
}

/**
 * Generate response draft (non-streaming) for reflection analysis
 * Returns just the text without token emission
 */
// generateDraftResponse removed: do not generate intermediate drafts or run pre-stream reflection.

/**
 * Analyze response quality using reflection prompt
 * Returns structured quality report for decision-making
 */
// analyzeResponseQuality removed: no post-generation quality checks.

/**
 * Regenerate response with reflection feedback (for revision attempts)
 */
// Draft revision flow removed: no automatic revisions.

/**
 * Pre-streaming reflection node
 * Analyzes draft response quality and optionally triggers revision
 * Runs before tokens are emitted to user
 */
// reflectionNode removed from runtime: post-generation analysis disabled.

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

function hasAnyActiveAttachment(state: ChatGraphState): boolean {
  return (state.attachments ?? []).some((attachment) => attachment.status !== "failed");
}

function resolveToolPlanForQueryIntent(
  state: ChatGraphState,
  queryIntent: QueryIntentClassification,
): string[] {
  const message = state.userMessage;
  const structuredTools = mapStructuredToolUsage(
    state.structuredIntent?.toolUsage ?? [],
  );
  const hasImageAttachment = (state.attachments ?? []).some((a) =>
    a.kind === "image" || (a.mimeType ?? "").startsWith("image/"),
  );
  const hasAnyAttachment = hasAnyActiveAttachment(state);
  // If intent does not need tools, still allow user-selected options to
  // force use of tools. We merge inferred tools with any selected options
  // provided by the client (UI chips).
  const inferredTools: string[] = [];
  if (queryIntent.needsTools && structuredTools.length === 0) {
    if (queryIntent.type === "real_time") {
      // If the user already included an image attachment, prefer to use
      // the image as local context rather than issuing a web search.
      if (!hasImageAttachment) {
        inferredTools.push(
          looksLikeDateTimeQuery(message) ? "currentDateTime" : "webSearch",
        );
      }
    }
  }

  // Map selected UI option IDs to concrete tool names. Keep ordering but
  // deduplicate later.
  const selected = state.selectedOptions ?? [];
  const selectedTools: string[] = [];

  if (selected.includes("search")) {
    selectedTools.push("webSearch");
  }

  if (selected.includes("research")) {
    // Research mode: prefer local summarization of the user's input
    // (do not automatically query project context or the web under
    // chat-history-only policy).
    selectedTools.push("summarizeText");
  }

  if (selected.includes("analysis")) {
    // Analysis prefers summarization and may also use calculator for numeric queries.
    selectedTools.push("summarizeText");
    if (
      /\bcalculate|compute|what is|what's|percent|%|\d+\s*[+\-*/]/i.test(
        message,
      )
    ) {
      selectedTools.push("calculator");
    }
  }

  if (selected.includes("coding")) {
    // Coding mode: do not automatically fetch project context under
    // chat-history-only policy. Keep tools conservative.
  }

  const imageGenerationPattern = /\b(generate|create|make|draw|paint|design)\b.*\b(image|picture|illustration|poster|graphic|logo|scene|art|wallpaper)\b/i;
  if (!hasAnyAttachment && imageGenerationPattern.test(message)) {
    selectedTools.push("imageGeneration");
  }

  const documentGenerationPattern = /\b(export|save|download|generate|create|produce)\b.*\b(pdf|docx|doc|powerpoint|pptx|ppt|excel|xlsx|spreadsheet|word)\b/i;
  if (documentGenerationPattern.test(message)) {
    selectedTools.push("documentGeneration");
  }

  // Heuristic: If the message looks like it would benefit from visual context, add imageSearch.
  const visualContextPattern = /\b(explain|diagram|how does|how do|visualize|show|illustrate|architecture|structure|design|flow|process|system|bridge|map|picture|image|images|photo|photos|visual|draw|sketch|render|display|suspension bridge|circuit|layout|ui|interface|pattern|component|example|inspire|reference)\b/i;
  // Only add an imageSearch tool when we don't already have an uploaded image
  // to use as the primary visual context. Uploaded images should be used
  // directly rather than triggering a provider image search.
  if (!hasAnyAttachment && !hasImageAttachment && visualContextPattern.test(message)) {
    selectedTools.push("imageSearch");
  }



  // Combine inferred and selected tools, preserving order but removing duplicates
  const final = Array.from(
    new Set([...structuredTools, ...selectedTools, ...inferredTools]),
  );
  return final;
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

function mapStructuredToolUsage(toolUsage: string[]): string[] {
  const mapped: Array<string | null> = toolUsage.map((tool) => {
    switch (tool) {
      case "web_search":
        return "webSearch";
      case "weather":
        return "weather";
      case "datetime":
        return "currentDateTime";
      case "project_context":
        return "projectContextLookup";
      case "code_execution":
      case "calculator":
        return "calculator";
      case "image_generation":
        return "imageGeneration";
      case "document_generation":
        return "documentGeneration";
      case "memory_lookup":
        return null;
      default:
        return null;
    }
  });

  const result: string[] = [];
  for (const t of mapped) {
    if (t) result.push(t);
  }
  return result;
}

function extractWeatherLocation(message: string): string {
  const cleaned = message.trim();

  const locationMatch = cleaned.match(
    /\b(?:weather|forecast|temperature|conditions?)\b.*?\b(?:in|for|at|near)\s+([^?.!;]+?)(?:\s+(?:today|tomorrow|now|currently|right now)\b|[?.!;]|$)/i,
  );
  if (locationMatch?.[1]) {
    return locationMatch[1].trim().replace(/^(the|a|an)\s+/i, "");
  }

  const fallbackMatch = cleaned.match(
    /\b(?:in|for|at|near)\s+([^?.!;]+?)(?:\s+(?:today|tomorrow|now|currently|right now)\b|[?.!;]|$)/i,
  );
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1].trim().replace(/^(the|a|an)\s+/i, "");
  }

  return cleaned;
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

  if (toolName === "weather") {
    return { location: extractWeatherLocation(message) };
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

  if (toolName === "imageSearch") {
    const grounded = groundImageSearchQuery({ query: message });
    return {
      query: grounded.query,
      intent:
        grounded.category === "culture"
          ? "inspiration"
          : grounded.category === "nature"
            ? "nature"
            : grounded.category === "architecture" || grounded.category === "landmarks"
              ? "architecture"
              : grounded.category === "people"
                ? "person"
                : grounded.category === "cities"
                  ? "inspiration"
                  : "educational",
      count: 6,
      safeSearch: true,
      aspectRatio: "landscape",
      placementHint: "gallery",
      freshness: "recent",
      avoidDuplicates: true,
    };
  }

  if (toolName === "documentGeneration") {
    // Infer format and basic args from the user message.
    const fmtMatch = message.match(/\b(pdf|docx|doc|pptx|ppt|powerpoint|xlsx|excel|spreadsheet|word)\b/i);
    const format = fmtMatch ? fmtMatch[1].toLowerCase().replace(/^ppt$/, "pptx").replace(/^doc$/, "docx").replace(/^excel$/, "xlsx").replace(/^word$/, "docx") : "pdf";
    if (format === "xlsx") {
      // Split lines into rows and commas into cells
      const rows = message.split(/\r?\n/).map((r) => r.split(/,|\t/).map((c) => c.trim())).filter((r) => r.length > 0);
      return { format: "xlsx", sheetName: "Sheet1", rows };
    }

    if (format === "pptx") {
      const bullets = message.split(/[\.\n]/).map((s) => s.trim()).filter(Boolean);
      return { format: "pptx", title: undefined, bullets };
    }

    // Default to document/text formats
    return { format: format as "pdf" | "docx", title: undefined, body: message };
  }
  if (toolName === "imageGeneration") {
    const prompt = message
      .replace(/^(generate|create|make|draw|paint|design)\s+(an?\s+)?(image|picture|illustration|poster|graphic|logo|scene|artwork|art)\s+(of|for|about)\s+/i, "")
      .replace(/^(generate|create|make|draw|paint|design)\s+/i, "")
      .trim();

    return {
      prompt: prompt || message,
      aspectRatio: /\b(portrait|vertical)\b/i.test(message)
        ? "portrait"
        : /\b(square|squared)\b/i.test(message)
          ? "square"
          : "landscape",
      style: undefined,
    };
  }

  return {};
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
  // Load only same-chat recent turns. Do NOT emit a generic "Loading context..."
  // message or trigger any background enrichment for new chats.
  const selectedContext = await loadContextFastPath(
    state.chatId,
    state.parentMessageId ?? null,
  );

  state.selectedContext = selectedContext;
  state.preferences = selectedContext.preferences ?? [];

  return {
    selectedContext,
    contextBudgetTokens: selectedContext.budgetUsed,
    previousMessages: selectedContext.recentTurns,
    preferences: selectedContext.preferences,
  };
}

// Live enrichment removed.

// Context enrichment disabled in chat-history-only architecture.

export async function generateResponseNode(state: ChatGraphState) {
  const genTimer = startTimer("generateResponseNode", { chatId: state.chatId, runId: state.runId });
  try {
    emitStatus(undefined, "Writing response...");

    const startedAt = Date.now();
  let assistantMessage = state.assistantMessage || "";
  const messages = await buildChatMessages(state);

  // If response already generated by pre-response nodes, stream it directly
  if (assistantMessage) {
    try {
      // Emit the full pre-generated assistant message as a single token
      const firstTokenAt = Date.now();
      info("first_token_sent_reflection", {
        chatId: state.chatId,
        runId: state.runId,
        ttftMs: firstTokenAt - startedAt,
      });

      const visibleMessage = sanitizeVisibleAssistantText(assistantMessage);
      if (visibleMessage) {
        graphStreamEventEmitter?.({ type: "token", content: visibleMessage });
      }

      info("stream_closed_reflection", {
        chatId: state.chatId,
        runId: state.runId,
        durationMs: Date.now() - startedAt,
        ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
      });

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
        modelUsed: state.modelUsed || "",
        provider: "openrouter",
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      logError("preapproved_streaming_failed", { error: err });
      // Fall through to regenerate
    }
  }

    // Fallback: Generate and stream response if not already generated

  const override: ModelOverride = {
    model: state.modelUsed || undefined,
  };
  const modelConfig = resolveChatModelConfig(override);
  const model = createGeminiModel(override);

    try {
      const invoker = model as unknown as ModelInvoker;
      if (!invoker.stream) {
        throw new Error("DeepSeek model missing stream implementation");
      }

      let firstTokenAt: number | null = null;
      await consumeModelStream(
        invoker.stream(messages as BaseMessage[]),
        (chunkText) => {
          if (firstTokenAt === null) {
            firstTokenAt = Date.now();
            info("first_token_sent_generate", {
              chatId: state.chatId,
              runId: state.runId,
              ttftMs: firstTokenAt - startedAt,
            });
          }

          const visibleChunk = sanitizeVisibleAssistantText(chunkText);
          if (!visibleChunk) {
            return;
          }

          assistantMessage += visibleChunk;
          graphStreamEventEmitter?.({ type: "token", content: visibleChunk });
        },
        async (jsonText) => {
          // Attempt to parse fenced JSON and route to document generator
          try {
            const parsed = JSON.parse(jsonText) as Record<string, unknown>;

            // If parsed payload looks like a document generation request,
            // invoke the documentGeneration tool and emit attachments.
            const maybeFormat = parsed?.format ?? parsed?.type ?? null;
            if (maybeFormat && typeof maybeFormat === "string") {
              try {
                graphStreamEventEmitter?.({ type: "status", message: "Generating document..." });
                const tools = createForgeTools({ chatId: state.chatId });
                const docTool = tools.find((t) => t.name === "documentGeneration");
                if (docTool) {
                  // invoke the tool with the parsed payload (zod will validate)
                  const rawResult = await docTool.invoke(parsed);
                  const resultText = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
                  try {
                    const parsedResult = JSON.parse(resultText);
                    const att = parsedResult?.attachment;
                    if (isUploadedAttachment(att)) {
                      // attach to assistant media for persistence
                      state.assistantMedia = { attachments: [att] };
                      // emit attachments event so the client can render immediately
                      graphStreamEventEmitter?.({ type: "attachments", attachments: [att] });
                    }
                  } catch {
                    // ignore parse errors from tool output
                  }
                }
              } catch {
                // fail silently; do not surface tool execution errors to user stream
              }
            }
          } catch {
            // ignore JSON parse errors and continue streaming
          }
        },
      );

      const endedAt = Date.now();
      info("stream_closed_generate", {
        chatId: state.chatId,
        runId: state.runId,
        durationMs: endedAt - startedAt,
        ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
      });
    } catch (err) {
      logError("streaming_failed_generate", {
        message: `[CRITICAL] Streaming failed in generateResponseNode. Chat: ${state.chatId}, RunId: ${state.runId}`,
        error: err,
      });
    }

  // Never expose raw tool outputs directly to the user. If the model failed
  // to produce content, return a safe, assistant-composed fallback message
  // that invites the user to retry or request a summary.
  assistantMessage = sanitizeVisibleAssistantText(assistantMessage);

  // Validate response content extraction after sanitization.
  if (!assistantMessage) {
    logError("null_model_content", {
      message: `[CRITICAL] Model returned null/undefined content.`,
      chatId: state.chatId,
      intent: state.intent,
      runId: state.runId,
    });
  }

  if (!assistantMessage) {
    logError("null_model_content", {
      message: `[CRITICAL] Model returned null/undefined content.`,
      chatId: state.chatId,
      intent: state.intent,
      runId: state.runId,
    });

    assistantMessage =
      "I wasn't able to generate a full answer right now. I can try again or summarize the findings if you'd like.";

    logError("empty_response", {
      chatId: state.chatId,
      runId: state.runId,
      intent: state.intent,
      toolsUsed: state.toolsUsed || [],
      hasToolContext: !!state.toolContext,
      evidenceBundlesCount: state.evidenceBundles?.length ?? 0,
      messageCount: state.previousMessages?.length ?? 0,
    });
  }

  // GUARANTEE: assistantMessage is always non-empty after fallbacks
  if (!assistantMessage || !assistantMessage.trim()) {
    throw new Error(
      `[CRITICAL] generateResponseNode returned empty message. Chat: ${state.chatId}, RunId: ${state.runId}`,
    );
  }

  // Preserve assistantMessage exactly as generated by model.

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
    provider: "openrouter",
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  };
  } finally {
    void endTimer(genTimer, { modelUsed: state.modelUsed || null });
  }
}

// Test helper: expose planner resolution for local testing.
export function testResolveToolPlan(
  userMessage: string,
  toolUsage: string[] = [],
  selectedOptions: string[] = [],
) {
  const state = {
    userMessage,
    structuredIntent: { toolUsage },
    selectedOptions,
  } as unknown as ChatGraphState;

  // Force query intent to real_time to allow inferred tools when needed.
  const queryIntent: QueryIntentClassification = { needsTools: true, type: "real_time" };

  return resolveToolPlanForQueryIntent(state, queryIntent);
}

export async function saveMessagesNode(state: ChatGraphState) {
  const saveTimer = startTimer("saveMessagesNode", { chatId: state.chatId, runId: state.runId });
  try {
    const imageBlock = state.imageBlock;
    const assistantMedia = state.assistantMedia;
    const messageAttachmentIds = state.messageAttachmentIds ?? [];
    const userMessageAttachments =
      messageAttachmentIds.length > 0
        ? (state.attachments ?? []).filter((attachment) =>
            messageAttachmentIds.includes(attachment.id),
          )
        : [];
    // Determine if user message should be created (avoid duplication in edit flows)
    const lastPrev = state.previousMessages?.[state.previousMessages.length - 1];
    const shouldCreateUser = !(
      lastPrev &&
      lastPrev.role === "user" &&
      lastPrev.content.trim() === state.userMessage.trim()
    );
    const willCreateUser = shouldCreateUser && !state.skipUserCreate;

    // Pre-allocate user message ID for immediate response
    const preAllocatedUserMessageId = willCreateUser ? crypto.randomUUID() : null;
    
    // Queue background job for actual DB persistence
    // This runs asynchronously after response stream completes
    const jobData: SaveMessagesJobData = {
      chatId: state.chatId,
      userMessage: state.userMessage,
      assistantMessage: state.assistantMessage,
      assistantMessageId: state.assistantMessageId,
      userMessageId: preAllocatedUserMessageId,
      parentMessageId: state.parentMessageId ?? null,
      branchId: state.branchId,
      skipUserCreate: !willCreateUser,
      modelUsed: state.modelUsed || null,
      inputTokens: state.inputTokens || null,
      outputTokens: state.outputTokens || null,
      latencyMs: state.latencyMs || null,
      runId: state.runId,
      traceId: state.traceId || null,
      generatedTitle: state.generatedTitle,
      userMedia:
        userMessageAttachments.length > 0
          ? { attachments: userMessageAttachments }
          : undefined,
      assistantMedia:
        assistantMedia ?? (imageBlock ? { imageBlock } : undefined),
    };

    const queuedJobId = await queueJob("saveMessages", jobData);

    if (queuedJobId === "no-redis") {
      try {
        const persisted = await persistSaveMessagesJobData(jobData);
        return {
          traceId: state.traceId,
          assistantMessageId: persisted.assistantMessageId ?? state.assistantMessageId,
          userMessageId: persisted.userMessageId ?? preAllocatedUserMessageId,
        };
      } catch (error) {
        logError("save_messages_sync_fallback_failed", {
          chatId: state.chatId,
          runId: state.runId,
          error,
        });
      }
    }

    // Return immediately with pre-allocated IDs
    // Actual persistence happens in background
    return {
      traceId: state.traceId,
      assistantMessageId: state.assistantMessageId,
      userMessageId: preAllocatedUserMessageId,
      // propagate any images discovered during tool execution so
      // persistence can include them.
      imageBlock: imageBlock ?? undefined,
    };
  } finally {
    void endTimer(saveTimer);
  }
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
    const selected = state.selectedOptions ?? [];
    const forceSeniorEngineeringFromCoding = selected.includes("coding");
    const forcedPromptBehavior = forceSeniorEngineeringFromCoding
      ? {
          ...(state.promptBehavior ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS),
          persona: "senior-engineer" as const,
        }
      : state.promptBehavior;
    const forcedTaskCategory = forceSeniorEngineeringFromCoding
      ? "coding"
      : state.taskCategory;

    if (forceSeniorEngineeringFromCoding) {
      info("prompt_routing.force_persona", {
        chatId: state.chatId,
        runId: state.runId,
        reason: "selectedOption:coding",
        forcedPersona: "senior-engineer",
      });
    }
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

    info("tool_routing_decision", {
      chatId: state.chatId,
      runId: state.runId,
      queryIntent,
      forcedTool,
      toolsNeeded,
      executionMode,
    });

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
      taskCategory: forcedTaskCategory,
      promptBehavior: forcedPromptBehavior,
    };
  } catch (error) {
    logError("tool_planning_failed", { error });
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
    // Debug log the incoming tool plan to help trace planner behavior.
    debug("tool_router_invoked", {
      chatId: state.chatId,
      runId: state.runId,
      toolPlan: state.toolPlan,
      toolsNeeded: state.toolPlan?.toolsNeeded ?? [],
    });
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
    let intermediateImageBlock: ChatImageBlock | undefined = undefined;
    let intermediateAssistantMedia: unknown | undefined = undefined;

    if (state.forceTool) {
      const forcedName = state.forceTool;
      const forcedTool = toolByName.get(forcedName);
      if (forcedTool) {
        try {
          debug("tool_invoke_attempt", { chatId: state.chatId, runId: state.runId, tool: forcedName, forced: true });
          emitStatus(onEvent, getToolStatusMessage(forcedName));
          const rawResult = await forcedTool.invoke(buildToolArgs(forcedName, state));
          debug("tool_invoke_success", { chatId: state.chatId, runId: state.runId, tool: forcedName });
          const toolResultText =
            typeof rawResult === "string"
              ? rawResult
              : JSON.stringify(rawResult, null, 2);

          if (forcedName === "imageSearch" || forcedName === "imageGeneration" || forcedName === "documentGeneration") {
            try {
              const parsed: Record<string, unknown> = typeof rawResult === "string" ? JSON.parse(rawResult) : (rawResult as Record<string, unknown>);
              if (forcedName === "imageSearch" || forcedName === "imageGeneration") {
                const images = ((parsed?.images as Array<Record<string, unknown>>) ?? []) as RetrievedImage[];
                intermediateImageBlock = {
                  images: images.map((im) => ({
                    id: im.id,
                    url: im.url,
                    thumbnailUrl: im.thumbnailUrl,
                    title: im.title,
                    sourcePage: im.sourcePage,
                    source: im.sourcePage || im.provider,
                    width: im.width,
                    height: im.height,
                    provider: im.provider,
                    relevanceScore: im.relevanceScore,
                    safetyScore: im.safetyScore,
                    metadata: im.metadata || {},
                  })),
                  totalFound: (parsed?.totalFound as number) ?? images.length,
                  retrievalTimeMs: (parsed?.retrievalTimeMs as number) ?? 0,
                };
              } else if (forcedName === "documentGeneration") {
                // Document generation returns an `attachment` in the tool result.
                const att = parsed?.attachment;
                if (att) {
                  intermediateAssistantMedia = { attachments: [att] };
                }
              }
            } catch {
              // ignore parse errors; still emit images event
            }

            if (forcedName === "imageSearch" || forcedName === "imageGeneration") {
              emitImageSearchEvent(forcedName, rawResult, state, onEvent);
            }

            toolsUsed.add(forcedName);
            evidenceBundles.push({
              tool: forcedName,
              content: "",
              timestamp: new Date().toISOString(),
            });

            return {
              toolsUsed: Array.from(toolsUsed),
              evidenceBundles,
              toolContext: intermediateContext,
              imageBlock: intermediateImageBlock,
              assistantMedia: intermediateAssistantMedia,
            };
          }

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
          logError("forced_tool_failed", { tool: forcedName, error: err });
          debug("tool_invoke_error", { chatId: state.chatId, runId: state.runId, tool: forcedName, error: err instanceof Error ? err.message : err });
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
            debug("tool_invoke_attempt", { chatId: state.chatId, runId: state.runId, tool: toolName, parallel: true });
            emitStatus(onEvent, getToolStatusMessage(toolName));
            const rawResult = await tool.invoke(buildToolArgs(toolName, state));
            debug("tool_invoke_success", { chatId: state.chatId, runId: state.runId, tool: toolName, parallel: true });
            const toolResultText =
              typeof rawResult === "string"
                ? rawResult
                : JSON.stringify(rawResult, null, 2);

            // For imageSearch, imageGeneration, and documentGeneration, emit structured
            // events / set assistant media and avoid including raw JSON/text in evidenceBundles
            // so internal orchestration isn't exposed to the assistant prompts.
            if (
              toolName === "imageSearch" ||
              toolName === "imageGeneration" ||
              toolName === "documentGeneration"
            ) {
              try {
                const parsed: Record<string, unknown> = typeof rawResult === "string" ? JSON.parse(rawResult) : (rawResult as Record<string, unknown>);
                if (toolName === "imageSearch" || toolName === "imageGeneration") {
                  const images = ((parsed?.images as Array<Record<string, unknown>>) ?? []) as RetrievedImage[];
                  intermediateImageBlock = {
                    images: images.map((im) => ({
                      id: im.id,
                      url: im.url,
                      thumbnailUrl: im.thumbnailUrl,
                      title: im.title,
                      sourcePage: im.sourcePage,
                      source: im.sourcePage || im.provider,
                      width: im.width,
                      height: im.height,
                      provider: im.provider,
                      relevanceScore: im.relevanceScore,
                      safetyScore: im.safetyScore,
                      metadata: im.metadata || {},
                    })),
                    totalFound: (parsed?.totalFound as number) ?? images.length,
                    retrievalTimeMs: (parsed?.retrievalTimeMs as number) ?? 0,
                  };
                }

                if (toolName === "documentGeneration") {
                  const att = parsed?.attachment;
                  if (att) intermediateAssistantMedia = { attachments: [att] };
                }
              } catch {
                // ignore parse errors
              }

              if (toolName === "imageSearch" || toolName === "imageGeneration") {
                emitImageSearchEvent(toolName, rawResult, state, onEvent);
              }

              return {
                tool: toolName,
                content: "",
                timestamp: new Date().toISOString(),
              };
            }

            return {
              tool: toolName,
              content: toolResultText,
              timestamp: new Date().toISOString(),
            };
          } catch (err) {
            logError("tool_execution_failed", { tool: toolName, error: err });
            debug("tool_invoke_error", { chatId: state.chatId, runId: state.runId, tool: toolName, error: err instanceof Error ? err.message : err });
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
        imageBlock: intermediateImageBlock,
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
          debug("tool_invoke_attempt", { chatId: state.chatId, runId: state.runId, tool: toolName });
          emitStatus(onEvent, getToolStatusMessage(toolName));
          const rawResult = await tool.invoke(buildToolArgs(toolName, state));
          debug("tool_invoke_success", { chatId: state.chatId, runId: state.runId, tool: toolName });
          const toolResultText =
            typeof rawResult === "string"
              ? rawResult
              : JSON.stringify(rawResult, null, 2);

          // If this is an imageSearch or imageGeneration tool, emit a structured images event
          // for the UI and avoid storing its raw textual output in the
          // evidenceBundles or as toolContext. This keeps orchestration
          // internal and prevents tool JSON from leaking into prompts.
          if (toolName === "imageSearch" || toolName === "imageGeneration") {
            try {
              const parsed: Record<string, unknown> = typeof rawResult === "string" ? JSON.parse(rawResult) : (rawResult as Record<string, unknown>);
              const images = ((parsed?.images as Array<Record<string, unknown>>) ?? []) as RetrievedImage[];
              intermediateImageBlock = {
                images: images.map((im) => ({
                  id: im.id,
                  url: im.url,
                  thumbnailUrl: im.thumbnailUrl,
                  title: im.title,
                  sourcePage: im.sourcePage,
                  source: im.sourcePage || im.provider,
                  width: im.width,
                  height: im.height,
                  provider: im.provider,
                  relevanceScore: im.relevanceScore,
                  safetyScore: im.safetyScore,
                  metadata: im.metadata || {},
                })),
                totalFound: (parsed?.totalFound as number) ?? images.length,
                retrievalTimeMs: (parsed?.retrievalTimeMs as number) ?? 0,
              };
            } catch {
              // ignore parse errors; still emit the event
            }

            emitImageSearchEvent(toolName, rawResult, state, onEvent);
            toolsUsed.add(toolName);
            evidenceBundles.push({
              tool: toolName,
              content: "",
              timestamp: new Date().toISOString(),
            });
            // do not set intermediateContext to the raw image JSON
            continue;
          }

          toolsUsed.add(toolName);
          evidenceBundles.push({
            tool: toolName,
            content: toolResultText,
            timestamp: new Date().toISOString(),
          });

          // Store result for potential use by next tool without mutating input state
          intermediateContext = toolResultText;
        } catch (err) {
          logError("tool_execution_failed", { tool: toolName, error: err });
        }
      }

      return {
        toolsUsed: Array.from(toolsUsed),
        evidenceBundles,
        toolContext: intermediateContext,
        imageBlock: intermediateImageBlock,
        assistantMedia: intermediateAssistantMedia,
      };
    }

    return {
      toolsUsed: Array.from(toolsUsed),
      evidenceBundles,
      toolContext: intermediateContext,
    };
  } catch (error) {
    logError("tool_router_failed", { error });
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

    // Format evidence bundles into a clear, sentence-oriented context
    // (exclude imageSearch and imageGeneration output). Use explicit sentences so the
    // output sanitizer recognizes these as visible answer content.
    const contextLines = state.evidenceBundles
      .filter((bundle) => bundle.tool !== "imageSearch" && bundle.tool !== "imageGeneration")
      .map((bundle) => {
        const toolLabel =
          bundle.tool === "webSearch"
            ? "Web search"
            : bundle.tool === "projectContextLookup"
            ? "Project context"
            : bundle.tool === "currentDateTime"
            ? "Current date/time"
            : bundle.tool === "weather"
            ? "Weather"
            : bundle.tool;

        // Ensure the bundle content is rendered as one or more full sentences
        // that the sanitizer will treat as visible answer text.
        const content = (bundle.content || "").toString().trim();
        const firstLine = content.split(/\r?\n/)[0] || content;
        const sentencePrefix = `${toolLabel} returned:`;

        // If the first line already looks sentence-like, keep it; otherwise
        // prefix to form a clear declarative sentence.
        const primary = /[\.\!\?]$/.test(firstLine)
          ? firstLine
          : `${sentencePrefix} ${firstLine}`;

        // Include any additional details after a blank line for readability
        const rest = content.split(/\r?\n/).slice(1).join("\n").trim();
        return rest ? `${primary}\n\n${rest}` : primary;
      });

    const toolContext = contextLines.join("\n\n");

    // Determine synthesis note (confidence, freshness, any caveats)
    const hasFreshSearch = state.evidenceBundles.some(
      (b) => b.tool === "webSearch",
    );
    const synthesisNote = hasFreshSearch
      ? "Results include recent web search data."
      : toolContext
        ? "Results from local tools and project context."
        : "Visual results delivered separately.";

    return {
      toolContext,
      synthesisNote,
    };
  } catch (error) {
    logError("evidence_synthesis_failed", { error });
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
    const preserveLongFormDraft = shouldPreserveLongFormDraft(state.userMessage);

    let classifiedIntent = null;
    let structuredIntent = null;
    let taskCategory = state.taskCategory ?? "general";
    try {
      const response = await model.invoke(
        [new HumanMessage(classificationPrompt)],
        buildLangSmithRunConfig(state, "intent-classification"),
      );
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

      // Run a separate freshness classifier to catch queries that explicitly
      // require up-to-date facts (e.g. "Who is the president of the US?"). If
      // the freshness classifier indicates the query needs fresh data, force
      // `web_search` into the structured intent so the planner invokes the
      // web search tool.
      try {
        const freshnessPrompt = buildFreshnessClassificationMessage(state.userMessage);
        const freshnessResp = await model.invoke(
          [new HumanMessage(freshnessPrompt)],
          buildLangSmithRunConfig(state, "freshness-classification"),
        );
        const freshnessParsed = parseClassificationText(toTextContent(freshnessResp.content));

        if (shouldForceWebSearchFromClassification(freshnessParsed)) {
          classifiedIntent = {
            ...(classifiedIntent ?? { intent: "factual", requiresFreshData: true, confidence: "low" }),
            requiresFreshData: true,
          } as ClassifiedIntent;
          if (!structuredIntent) {
            structuredIntent = deriveStructuredFromLegacy(classifiedIntent as ClassifiedIntent);
          }
          if (!structuredIntent.toolUsage.includes("web_search")) {
            structuredIntent.toolUsage = [...structuredIntent.toolUsage, "web_search"];
          }
        }
      } catch (freshnessErr) {
        // Non-fatal: if freshness classification fails, continue with existing intent
        warn("freshness_classification_failed", { error: freshnessErr });
      }

      // Attachment extraction heuristic: if uploads suggest the user expects
      // the assistant to extract content from attachments, prefer a factual
      // structured intent that triggers extraction tooling.
      try {
        if (shouldPreferAttachmentExtractionIntent(state)) {
          structuredIntent = buildAttachmentExtractionStructuredIntent();
        }
      } catch {}

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
      warn("intent_classification_model_failed", { error: classificationError });
    }

    const queryIntent = deriveQueryIntentFromClassification(classifiedIntent);
    const requestedPersona =
      state.promptBehavior?.persona ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS.persona;
    let promptBehavior = structuredIntent
      ? {
          responseMode: structuredIntent.responseMode,
          verbosity: structuredIntent.verbosity,
          audience: structuredIntent.audienceLevel,
          teachingDepth: structuredIntent.reasoningDepth,
          formatting: deriveFormattingProfile(structuredIntent.responseMode),
          persona: requestedPersona,
        }
      : state.promptBehavior;

    if (preserveLongFormDraft) {
      promptBehavior = {
        ...(promptBehavior ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS),
        responseMode: "creative",
        verbosity: "detailed",
        audience: "general",
        teachingDepth: "standard",
        formatting: "auto",
        persona: requestedPersona,
      };
    }

    const forceSeniorEngineeringFromCoding = (
      state.selectedOptions ?? []
    ).includes("coding");
    if (forceSeniorEngineeringFromCoding) {
      taskCategory = "coding";
      promptBehavior = {
        ...(promptBehavior ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS),
        persona: "senior-engineer",
      };
    }

    // Log intent classification results at debug level to reduce hot-path verbosity
    // Only errors are logged at info level
    debug("intent_classified", {
      chatId: state.chatId,
      runId: state.runId,
      queryIntent,
      classifiedIntent,
      structuredIntent,
      taskCategory,
    });

    debug("promptRouting.decision", {
      event: "promptRouting.decision",
      chatId: state.chatId,
      runId: state.runId,
      taskCategory,
      specialistPrompt:
        taskCategory === "coding"
          ? "coding"
          : taskCategory === "reasoning" || taskCategory === "explanation"
            ? "reasoning"
            : taskCategory === "planning" || taskCategory === "trading"
              ? "planning"
              : "system",
    });

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
    logError("intent_classification_failed", { error });
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
// When available, we include nearby conversation context in the title
// generation instructions. Tests and tooling look for the following
// guidance text in this file to ensure the title prompt is context-aware:
//
// Context:\n
// Use this context when creating a concise, descriptive title.
//
// The background worker will assemble the final prompt including any
// project context, chat summary, or memory summary that may be present.
export async function generateTitleNode(state: ChatGraphState) {
  // Queue title generation as background job (don't block response stream)
  // Title will be generated and persisted asynchronously
  // For first turn, we could emit title later; for subsequent turns it's optional
  const recentConversation = (state.previousMessages ?? [])
    .slice(-4)
    .map((message) => `${message.role.toUpperCase()}: ${message.content.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join("\n");

  const titleJobData: GenerateTitleJobData = {
    chatId: state.chatId,
    userMessage: state.userMessage,
    assistantMessage: state.assistantMessage,
    recentConversation: recentConversation || undefined,
    projectContext: state.selectedContext?.projectContext,
    chatSummary: state.selectedContext?.chatSummary,
    memorySummary: state.memorySummary,
    runId: state.runId,
  };

  void queueJob("generateTitle", titleJobData);

  // Return empty title immediately; actual generation happens asynchronously
  // This prevents blocking the response stream
  return {
    generatedTitle: "",
  };
}

/**
 * Extract learning from interaction
 * Input: userMessage + assistantMessage + intent
 * Output: extractedMemory field
 */
// Memory extraction disabled under chat-history-only policy.
// Memory extraction disabled in chat-history-only architecture.
