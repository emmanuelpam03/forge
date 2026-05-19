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
import { info, warn, error as logError } from "@/lib/logger";
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
import type { RetrievedImage } from "@/ai/tools/image-types";

function emitImageSearchEvent(
  toolName: string,
  rawResult: unknown,
  state: ChatGraphState,
  onEvent?: (event: StreamEvent) => void,
) {
  if (toolName !== "imageSearch") return;

  try {
    const parsed: Record<string, unknown> = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
    const images = ((parsed?.images as Array<Record<string, unknown>>) ?? []) as RetrievedImage[];

    const payload = {
      type: "images" as const,
      query: parsed?.queryUsed || buildToolArgs(toolName, state).query || "",
      provider: parsed?.provider || "",
      images: images.map((im) => ({
        id: im.id,
        url: im.url,
        thumbnailUrl: im.thumbnailUrl,
        title: im.title,
        sourcePage: im.sourcePage,
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
import { getReflectionPrompt } from "@/ai/prompts/promptRegistry";
import {
  parseReflectionReport,
  type ReflectionReport,
} from "@/ai/graph/reflection.prompt";
import { DEFAULT_PROMPT_BEHAVIOR_CONTROLS } from "@/ai/prompts/control.types";

// Lightweight typing for models we interact with. We avoid `any` and declare
// the minimal surface used by this module: `invoke`, `stream`, and `nativeStream`.
type ModelInvoker = {
  invoke?: (messages: BaseMessage[] | unknown, opts?: unknown) => Promise<unknown>;
  stream?: (messages: BaseMessage[]) => AsyncIterable<unknown>;
  nativeStream?: (messages: BaseMessage[]) => AsyncIterable<unknown>;
};

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

  try {
    const sanitized = sanitizeAssistantOutput(normalized);
    return sanitized || normalized;
  } catch (err) {
    warn("sanitization_failed", { error: err });
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
async function generateDraftResponse(state: ChatGraphState): Promise<string> {
  const override: ModelOverride = {
    model: state.modelUsed || undefined,
    provider:
      (state.provider as "google-genai" | "ollama" | "openrouter" | undefined) || undefined,
  };
  const model = createGeminiModel(override);
  const messages = buildChatMessages(state);

  try {
    let draftText = "";

    // For draft generation, use non-streaming invoke to get full response quickly
    const invoker = model as unknown as ModelInvoker;
    if (!invoker.invoke) {
      throw new Error("Model does not support non-streaming invoke");
    }
    const response = await invoker.invoke(
      messages as BaseMessage[],
      buildLangSmithRunConfig(state, "draft-response"),
    );
    draftText = extractTextFromModelChunk(response);

    if (!draftText?.trim()) {
      if (state.toolContext) {
        draftText = "Based on the information I found:\n\n" + state.toolContext;
      } else {
        draftText =
          "I encountered an issue generating a response. Please try again or rephrase your question.";
      }
    }

    return normalizeAssistantResponseText(draftText);
  } catch (error) {
    logError("draft_generation_failed", { error });
    return (
      state.toolContext ||
      "I encountered an issue generating a response. Please try again or rephrase your question."
    );
  }
}

/**
 * Analyze response quality using reflection prompt
 * Returns structured quality report for decision-making
 */
async function analyzeResponseQuality(
  response: string,
  userMessage: string,
): Promise<ReflectionReport> {
  if (!response?.trim()) {
    return {
      score: 1,
      issues: [
        {
          dimension: "completeness",
          severity: "critical",
          description: "Response is empty or blank",
        },
      ],
      suggestRevision: true,
      revisionFocus: "Generate a non-empty response",
    };
  }

  try {
    const reflectionPrompt = getReflectionPrompt();
    const model = createGeminiModel();

    // Build reflection message
    const reflectionMessage = new HumanMessage(
      `RESPONSE TO EVALUATE:\n\n${response}\n\n` +
        `USER QUERY:\n${userMessage}\n\n` +
        `${reflectionPrompt}`,
    );

    // Invoke reflection analysis (non-streaming for quick turnaround)
    const invoker = model as unknown as ModelInvoker;
    if (!invoker.invoke) {
      throw new Error("Model does not support non-streaming invoke");
    }
    const analysisResponse = await invoker.invoke([reflectionMessage]);
    const analysisText = extractTextFromModelChunk(analysisResponse);

    const report = parseReflectionReport(analysisText);
    return report;
  } catch (error) {
    logError("reflection_analysis_failed", { error });
    // Return neutral report on failure to allow response to proceed
    return {
      score: 5,
      issues: [],
      suggestRevision: false,
      strengths: "Unable to analyze quality; response appears functional",
    };
  }
}

/**
 * Regenerate response with reflection feedback (for revision attempts)
 */
async function generateDraftResponseWithFeedback(
  state: ChatGraphState,
  feedback: string,
): Promise<string> {
  const override: ModelOverride = {
    model: state.modelUsed || undefined,
    provider:
      (state.provider as "google-genai" | "ollama" | "openrouter" | undefined) || undefined,
  };
  const model = createGeminiModel(override);
  const messages = buildChatMessages(state);

  // Add feedback context to messages
  const messagesWithFeedback: BaseMessage[] = [
    ...messages,
    new HumanMessage(
      `Quality feedback on your previous response:\n${feedback}\n\n` +
        `Please revise the response to address the feedback. Keep the core content ` +
        `but improve clarity, remove redundancy, or fix any issues identified.`,
    ),
  ];

  try {
    const invoker = model as unknown as ModelInvoker;
    if (!invoker.invoke) {
      throw new Error("Model does not support non-streaming invoke");
    }
    const response = await invoker.invoke(
      messagesWithFeedback,
      buildLangSmithRunConfig(state, "draft-revision"),
    );
    const revisedText = extractTextFromModelChunk(response);

    return normalizeAssistantResponseText(
      revisedText ||
        state.toolContext ||
        "I encountered an issue generating a response. Please try again or rephrase your question.",
    );
  } catch (error) {
    logError("response_revision_failed", { error });
    // Return original draft if revision fails
    return state.draftResponse || "";
  }
}

/**
 * Pre-streaming reflection node
 * Analyzes draft response quality and optionally triggers revision
 * Runs before tokens are emitted to user
 */
export async function reflectionNode(state: ChatGraphState) {
  const startedAt = Date.now();

  // Generate initial draft (non-streaming)
  let draftResponse = state.draftResponse;
  if (!draftResponse) {
    emitStatus(undefined, "Analyzing quality...");
    draftResponse = await generateDraftResponse(state);
  }

  // Analyze quality
  const report = await analyzeResponseQuality(draftResponse, state.userMessage);

  info("reflection_analysis", {
    chatId: state.chatId,
    runId: state.runId,
    score: report.score,
    issueCount: report.issues.length,
    suggestRevision: report.suggestRevision,
    durationMs: Date.now() - startedAt,
  });

  // Determine if revision is needed
  const iterationCount = (state.reflectionIterationCount ?? 0) + 1;
  let finalResponse = draftResponse;

  if (report.suggestRevision && iterationCount < 2 && report.revisionFocus) {
    // Attempt revision
    emitStatus(undefined, "Refining response...");
    const revisedResponse = await generateDraftResponseWithFeedback(
      state,
      report.revisionFocus,
    );

    // Re-analyze revised response
    const revisedReport = await analyzeResponseQuality(
      revisedResponse,
      state.userMessage,
    );

    info("reflection_revision", {
      chatId: state.chatId,
      runId: state.runId,
      originalScore: report.score,
      revisedScore: revisedReport.score,
      iterationCount,
    });

    // Use revised response if quality improved or stayed same (prefer conciseness)
    if (revisedReport.score >= report.score - 1) {
      finalResponse = revisedResponse;
      report.score = revisedReport.score;
      report.issues = revisedReport.issues;
    }
  }

  return {
    draftResponse: finalResponse,
    reflectionReport: report,
    responseRevisionFeedback: report.revisionFocus,
    reflectionIterationCount: iterationCount,
    assistantMessage: finalResponse,
  };
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
  const structuredTools = mapStructuredToolUsage(
    state.structuredIntent?.toolUsage ?? [],
  );
  // If intent does not need tools, still allow user-selected options to
  // force use of tools. We merge inferred tools with any selected options
  // provided by the client (UI chips).
  const inferredTools: string[] = [];
  if (queryIntent.needsTools && structuredTools.length === 0) {
    if (queryIntent.type === "real_time") {
      inferredTools.push(
        looksLikeDateTimeQuery(message) ? "currentDateTime" : "webSearch",
      );
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
    // Research should check both local project context and the web.
    selectedTools.push("projectContextLookup");
    selectedTools.push("webSearch");
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
    // Coding benefits from project context lookup to find relevant code/docs.
    selectedTools.push("projectContextLookup");
  }

  // Heuristic: If the message looks like it would benefit from visual context, add imageSearch.
  const visualContextPattern = /\b(explain|diagram|how does|how do|visualize|show|illustrate|architecture|structure|design|flow|process|system|bridge|map|picture|image|images|photo|photos|visual|draw|sketch|render|display|suspension bridge|circuit|layout|ui|interface|pattern|component|example|inspire|reference)\b/i;
  if (visualContextPattern.test(message)) {
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
  return toolUsage
    .map((tool) => {
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
          return "calculator";
        case "memory_lookup":
          return null;
        default:
          return null;
      }
    })
    .filter((tool): tool is string => Boolean(tool));
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
    return { query: message };
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

  const startedAt = Date.now();
  let assistantMessage = state.assistantMessage || "";
  const messages = buildChatMessages(state);

  // If response already generated by reflectionNode, stream it directly
  if (assistantMessage?.trim()) {
    try {
      // Stream the pre-approved response
      let firstTokenAt: number | null = null;
      const tokens = assistantMessage.split(/(\s+)/);

      for (const token of tokens) {
        if (!token.trim()) {
          continue;
        }

        if (firstTokenAt === null) {
          firstTokenAt = Date.now();
          info("first_token_sent_reflection", {
            chatId: state.chatId,
            runId: state.runId,
            ttftMs: firstTokenAt - startedAt,
            reflectionScore: state.reflectionReport?.score,
          });
        }

        graphStreamEventEmitter?.({ type: "token", content: token });
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
      assistantMessage = humanizeAssistantResponseText(
        assistantMessage,
        shouldUseHumanizationMode(state.userMessage),
      );
      const outputTokens = estimateTokens(assistantMessage);

      return {
        assistantMessage,
        modelUsed: state.modelUsed || "",
        provider: state.provider || "",
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
      (state.provider as "google-genai" | "ollama" | "openrouter" | undefined) || undefined,
  };
  const model = createGeminiModel(override);
  const modelConfig = getChatModelConfig(override);

  try {
    let tokenStream: AsyncIterable<unknown>;

    const modelConfigInTry = modelConfig;
    const invoker = model as unknown as ModelInvoker;
    if (modelConfigInTry.provider === "ollama") {
      if (!invoker.stream) throw new Error("Ollama provider missing stream implementation");
      tokenStream = invoker.stream(messages as BaseMessage[]);
    } else {
      if (!invoker.nativeStream) throw new Error("Gemini provider missing nativeStream implementation");
      tokenStream = invoker.nativeStream(messages as BaseMessage[]);
    }

    let firstTokenAt: number | null = null;
    for await (const token of tokenStream) {
      const chunkText = extractTextFromModelChunk(token);
      if (!chunkText.trim()) {
        continue;
      }

      if (firstTokenAt === null) {
        firstTokenAt = Date.now();
        info("first_token_sent_generate", {
          chatId: state.chatId,
          runId: state.runId,
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

  // Validate response content extraction
  if (!assistantMessage) {
    logError("null_model_content", {
      message: `[CRITICAL] Model returned null/undefined content.`,
      chatId: state.chatId,
      intent: state.intent,
      runId: state.runId,
    });
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

// Test helper: expose planner resolution for local testing.
export function testResolveToolPlan(
  userMessage: string,
  toolUsage: string[] = [],
  selectedOptions: string[] = [],
) {
  const state: any = {
    userMessage,
    structuredIntent: { toolUsage },
    selectedOptions,
  };

  // Force query intent to real_time to allow inferred tools when needed.
  const queryIntent: QueryIntentClassification = { needsTools: true, type: "real_time" };

  return resolveToolPlanForQueryIntent(state, queryIntent);
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
      warn("save_chat_analytics_failed", { chatId: state.chatId, error });
    });

  // Maintain rolling chat summary in background so stream completion is not delayed.
  void maintainChatSummary(state.chatId).catch((err) => {
    warn("maintain_chat_summary_failed", { chatId: state.chatId, error: err });
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
          logError("forced_tool_failed", { tool: forcedName, error: err });
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

            // Emit images event if this is an imageSearch tool
            emitImageSearchEvent(toolName, rawResult, state, onEvent);

            return {
              tool: toolName,
              content: toolResultText,
              timestamp: new Date().toISOString(),
            };
          } catch (err) {
            logError("tool_execution_failed", { tool: toolName, error: err });
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

          // Emit images event if this is an imageSearch tool
          emitImageSearchEvent(toolName, rawResult, state, onEvent);

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

    // Format evidence bundles into a clear context (exclude imageSearch output)
    const contextLines = state.evidenceBundles
      .filter((bundle) => bundle.tool !== "imageSearch")
      .map((bundle) => `## ${bundle.tool.toUpperCase()}\n${bundle.content}`);

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

    info("intent_classified", {
      chatId: state.chatId,
      runId: state.runId,
      queryIntent,
      classifiedIntent,
      structuredIntent,
      taskCategory,
      message: state.userMessage,
    });

    info("promptRouting.decision", {
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

    const response = await model.invoke(
      [new HumanMessage(prompt)],
      buildLangSmithRunConfig(state, "title-generation"),
    );
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
    logError("title_generation_failed", { error });
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

    const response = await model.invoke(
      [new HumanMessage(prompt)],
      buildLangSmithRunConfig(state, "memory-extraction"),
    );
    const extractedMemory = toTextContent(response.content)
      .trim()
      .replace(/^["']|["']$/g, "");

    // Phase 6: Update user memory with extracted fact (deduplicated & ranked)
    if (extractedMemory) {
      await updateUserMemory(extractedMemory).catch((err) => {
        warn("update_user_memory_failed", { error: err });
        // Non-blocking - don't throw
      });
    }

    return {
      extractedMemory,
    };
  } catch (error) {
    logError("memory_extraction_failed", { error });
    return {
      extractedMemory: "",
    };
  }
}
