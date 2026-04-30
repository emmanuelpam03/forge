import "server-only";

import {
  HumanMessage,
  SystemMessage,
  type AIMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import prisma from "@/lib/prisma";
import { createGeminiModel } from "@/ai/models";
import {
  buildChatMessages,
  buildFreshnessClassificationMessage,
} from "@/ai/prompts/router";
import {
  loadContextForChat,
  maintainChatSummary,
  updateUserMemory,
} from "@/ai/context/engine";
import { createForgeTools } from "@/ai/tools";
import { hashIdentifierForLogging } from "@/lib/logging";
import {
  parseClassificationText,
  shouldForceWebSearchFromClassification,
} from "@/ai/graph/classification";
import type { ChatGraphState } from "@/ai/graph/state";

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

function getUsageCounts(message: AIMessage) {
  const usageMetadata = message.usage_metadata;
  const responseMetadata = message.response_metadata as {
    usageMetadata?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  return {
    inputTokens:
      usageMetadata?.input_tokens ??
      responseMetadata?.usageMetadata?.input_tokens ??
      0,
    outputTokens:
      usageMetadata?.output_tokens ??
      responseMetadata?.usageMetadata?.output_tokens ??
      0,
  };
}

function getModelName(message: AIMessage): string {
  const responseMetadata = message.response_metadata as {
    model_name?: string;
    modelName?: string;
  };

  return (
    responseMetadata?.model_name ?? responseMetadata?.modelName ?? "gemini"
  );
}

/**
 * Sanitize user input to prevent prompt injection attacks.
 * Removes/escapes common injection patterns and truncates excessively long inputs.
 */
function sanitizeUserInput(input: string, maxLength: number = 2000): string {
  // Truncate to max length
  let sanitized = input.slice(0, maxLength).trim();

  // Remove common prompt injection patterns
  const injectionPatterns = [
    /ignore\s+all\s+previous\s+instructions?/gi,
    /forget\s+about/gi,
    /disregard\s+everything\s+above/gi,
    /new\s+system\s+prompt/gi,
    /override\s+your\s+instructions/gi,
    /respond\s+as\s+if/gi,
    /pretend\s+you\s+are/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized.trim();
}

/**
 * Checks if text looks like a valid numeric expression for the calculator tool.
 * The calculator needs expressions like "100 * 0.15", not prose like "Web search result: ..."
 * This is needed for multi-sequential tool chaining where intermediate results are prose.
 */
function isValidNumericExpression(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  // Allow digits, operators, parentheses, decimal points, and basic function names
  // Reject prose indicators (URLs, search results, colons indicating key-value pairs)
  return (
    /^[0-9+\-*/%().\s^a-zA-Z]+$/.test(text) &&
    !/https?:\/\/|search|result|:/i.test(text)
  );
}

async function executeWebSearchTool(
  state: ChatGraphState,
  tools: ReturnType<typeof createForgeTools>,
  evidenceBundles: Array<{ tool: string; content: string; timestamp: string }>,
  toolsUsed: Set<string>,
) {
  const webSearchTool = tools.find((tool) => tool.name === "webSearch");
  if (!webSearchTool) {
    return {
      toolsUsed: Array.from(toolsUsed),
      evidenceBundles,
      toolContext: state.toolContext,
    };
  }

  const rawResult = await webSearchTool.invoke({
    query: state.userMessage,
    maxResults: 5,
  });
  const toolResultText =
    typeof rawResult === "string"
      ? rawResult
      : JSON.stringify(rawResult, null, 2);

  toolsUsed.add("webSearch");
  evidenceBundles.push({
    tool: "webSearch",
    content: toolResultText,
    timestamp: new Date().toISOString(),
  });

  console.info(
    JSON.stringify({
      event: "webSearch.forced_result",
      chatId: hashIdentifierForLogging(state.chatId),
      runId: hashIdentifierForLogging(state.runId),
      toolResult: toolResultText,
    }),
  );

  return {
    toolsUsed: Array.from(toolsUsed),
    evidenceBundles,
    toolContext: `Web Search Result:\n${toolResultText}`,
  };
}

export async function loadContextNode(state: ChatGraphState) {
  const selectedContext = await loadContextForChat(state.chatId);

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
  const model = createGeminiModel();
  const messages = buildChatMessages(state);
  const startedAt = Date.now();
  const response = (await model.invoke(messages as BaseMessage[])) as AIMessage;
  let assistantMessage = toTextContent(response.content).trim();

  // Validate response content extraction
  if (!response.content) {
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

  const { inputTokens, outputTokens } = getUsageCounts(response);

  return {
    assistantMessage,
    modelUsed: getModelName(response),
    provider: "google-genai",
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
  };
}

export async function saveMessagesNode(state: ChatGraphState) {
  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      await tx.message.create({
        data: {
          chatId: state.chatId,
          role: "user",
          content: state.userMessage,
        },
      });

      await tx.message.create({
        data: {
          chatId: state.chatId,
          role: "assistant",
          content: state.assistantMessage,
          modelUsed: state.modelUsed || null,
          provider: state.provider || null,
          tokensInput: state.inputTokens || null,
          tokensOutput: state.outputTokens || null,
          latencyMs: state.latencyMs || null,
          runId: state.runId || null,
          traceId: state.traceId || null,
        },
      });

      // Persist generated title if available (only on first turn)
      const chatUpdateData: Record<string, unknown> = {
        lastMessageAt: now,
      };
      if (state.generatedTitle && state.previousMessages.length === 0) {
        chatUpdateData.title = state.generatedTitle;
      }

      await tx.chat.update({
        where: { id: state.chatId },
        data: chatUpdateData,
      });

      await tx.chatRunAnalytics.create({
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
      });
    },
    { timeout: 15000 },
  );

  // Phase 4: Maintain rolling chat summary
  // This runs after message save completes
  await maintainChatSummary(state.chatId).catch((err) => {
    console.warn(`Failed to maintain chat summary for ${state.chatId}:`, err);
    // Don't throw - summary maintenance is non-blocking
  });

  return {
    traceId: state.traceId,
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
    // If an external caller forced a tool, short-circuit planning and honor it.
    if (
      state.forceTool ||
      shouldForceWebSearchFromClassification(state.classifiedIntent)
    ) {
      const forced = state.forceTool;
      const classifier = state.classifiedIntent;
      if (classifier) {
        console.info(
          JSON.stringify({
            event: "toolRouting.forced",
            chatId: hashIdentifierForLogging(state.chatId),
            runId: hashIdentifierForLogging(state.runId),
            classifier,
            forcedTool: forced || "webSearch",
          }),
        );
      }

      return {
        toolPlan: {
          intent: state.intent || state.classifiedIntent?.intent || "factual",
          toolsNeeded: [forced || "webSearch"],
          sequential: false,
          followUpNeeded: false,
        },
        executionMode: "single",
      };
    }

    const model = createGeminiModel();

    // Sanitize user input to prevent prompt injection
    const sanitizedMessage = sanitizeUserInput(state.userMessage);

    const systemPrompt = `You are a tool planner for Forge. Analyze the user request and decide which tools would improve the answer.

Available tools:
- calculator: For arithmetic, percentages, conversions, risk calculations
- currentDateTime: For current time, timezones, dates, scheduling
- webSearch: For current facts, news, prices, products, changing information
- summarizeText: For summarizing long content or extracting key points
- projectContextLookup: For project history, prior decisions, or project-specific notes

Return a JSON object with:
{
  "toolsNeeded": ["tool1", "tool2"] or [],
  "sequential": false if independent, true if tool B needs tool A result,
  "followUpNeeded": true only if a critical constraint is missing (budget, location, timeframe, project, account),
  "followUpQuestion": "What is X?" if followUpNeeded is true
}

Rules:
- Use tools proactively. Do not wait for explicit user requests like "search for", "calculate", etc.
- If uncertain, default to no tools.
- For independent tools (time + news), set sequential to false.
- For dependent tools (search price → calculate margin), set sequential to true.
- Only ask follow-up for constraints that fundamentally change the answer.
- Respond with ONLY the JSON object, no markdown or explanation.`;

    const userPrompt = `User intent: ${state.intent}
Project context available: ${state.memorySummary ? "yes" : "no"}
User request: ${sanitizedMessage}`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);
    const responseText = toTextContent(response.content);

    let parsedPlan;
    try {
      parsedPlan = JSON.parse(responseText);
    } catch {
      console.warn("Failed to parse tool plan JSON, defaulting to no tools");
      parsedPlan = {
        toolsNeeded: [],
        sequential: false,
        followUpNeeded: false,
      };
    }

    const toolsNeeded = Array.isArray(parsedPlan.toolsNeeded)
      ? parsedPlan.toolsNeeded
      : [];
    const sequential = parsedPlan.sequential === true;
    const followUpNeeded = parsedPlan.followUpNeeded === true;
    const followUpQuestion = parsedPlan.followUpQuestion || "";

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

    return {
      toolPlan: {
        intent: state.intent,
        toolsNeeded,
        sequential,
        followUpNeeded,
        followUpQuestion,
      },
      executionMode,
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
    };
  }
}

/**
 * Execute tools based on the plan
 * Input: toolPlan + executionMode + userMessage
 * Output: toolsUsed + evidenceBundles
 */
export async function toolRouterNode(state: ChatGraphState) {
  try {
    // If no tools needed, return early
    if (!state.toolPlan || state.toolPlan.toolsNeeded.length === 0) {
      if (shouldForceWebSearchFromClassification(state.classifiedIntent)) {
        const tools = createForgeTools({ chatId: state.chatId });
        return executeWebSearchTool(state, tools, [], new Set<string>());
      }

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

    if (shouldForceWebSearchFromClassification(state.classifiedIntent)) {
      console.info(
        JSON.stringify({
          event: "toolRouter.forced_web_search",
          chatId: hashIdentifierForLogging(state.chatId),
          runId: hashIdentifierForLogging(state.runId),
          classifier: state.classifiedIntent,
        }),
      );
      return executeWebSearchTool(state, tools, evidenceBundles, toolsUsed);
    }

    // If a caller forced a tool, run it deterministically and return its results.
    if (state.forceTool) {
      const forcedName = state.forceTool;
      const forcedTool = toolByName.get(forcedName);
      if (forcedTool) {
        try {
          let args: Record<string, unknown> = {};
          if (forcedName === "webSearch") {
            args = { query: state.userMessage, maxResults: 5 };
          }

          const rawResult = await forcedTool.invoke(args);
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

    // For multi-parallel execution, run independent tools concurrently
    if (state.executionMode === "multi-parallel") {
      const independentTools = state.toolPlan.toolsNeeded.filter(
        (t) => t !== "webSearch",
      );

      const parallelResults = await Promise.all(
        independentTools.map(async (toolName) => {
          const tool = toolByName.get(toolName);
          if (!tool) return null;

          try {
            let args: Record<string, unknown> = {};
            // Build appropriate arguments based on tool
            if (toolName === "calculator") {
              args = { expression: state.userMessage };
            } else if (toolName === "currentDateTime") {
              args = { mode: "now" };
            } else if (toolName === "summarizeText") {
              args = { text: state.userMessage };
            } else if (toolName === "projectContextLookup") {
              args = { query: state.userMessage, maxResults: 5 };
            }

            const rawResult = await tool.invoke(args);
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

    // For multi-sequential execution, run tools in order
    if (state.executionMode === "multi-sequential") {
      for (const toolName of state.toolPlan.toolsNeeded) {
        const tool = toolByName.get(toolName);
        if (!tool) continue;

        try {
          let args: Record<string, unknown> = {};
          if (toolName === "calculator") {
            // For sequential chaining, check if previous result is a valid numeric expression
            // If previous tool returned prose (e.g., web search), fall back to user message
            const expression =
              intermediateContext &&
              isValidNumericExpression(intermediateContext)
                ? intermediateContext
                : state.userMessage;
            args = { expression };
          } else if (toolName === "currentDateTime") {
            args = { mode: "now" };
          } else if (toolName === "webSearch") {
            args = { query: state.userMessage, maxResults: 5 };
          } else if (toolName === "summarizeText") {
            args = {
              text: intermediateContext || state.userMessage,
              maxSentences: 3,
            };
          } else if (toolName === "projectContextLookup") {
            args = { query: state.userMessage, maxResults: 5 };
          }

          const rawResult = await tool.invoke(args);
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
    if (state.classifiedIntent) {
      console.info(
        JSON.stringify({
          event: "classifier.seeded",
          chatId: hashIdentifierForLogging(state.chatId),
          runId: hashIdentifierForLogging(state.runId),
          classifier: state.classifiedIntent,
        }),
      );

      return {
        intent: state.classifiedIntent.intent,
        classifiedIntent: state.classifiedIntent,
      };
    }

    const model = createGeminiModel();
    const message = buildFreshnessClassificationMessage(state.userMessage);

    const response = await model.invoke([new HumanMessage(message)]);
    const classifiedIntent = parseClassificationText(
      toTextContent(response.content),
    );

    console.info(
      JSON.stringify({
        event: "classifier.output",
        chatId: hashIdentifierForLogging(state.chatId),
        runId: hashIdentifierForLogging(state.runId),
        classifier: classifiedIntent,
      }),
    );

    return {
      intent: classifiedIntent.intent,
      classifiedIntent,
    };
  } catch (error) {
    console.error("Intent classification failed:", error);
    return {
      intent: "factual",
      classifiedIntent: {
        intent: "factual",
        requiresFreshData: false,
        confidence: "low",
      },
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
    const sanitizedMessage = sanitizeUserInput(state.userMessage);
    const sanitizedAssistant = sanitizeUserInput(state.assistantMessage);
    const prompt = `Generate a short, 3–7 word chat title based on this exchange:

User: "${sanitizedMessage}"
Assistant: "${sanitizedAssistant}"

Respond with ONLY the title, no quotes or punctuation.`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const generatedTitle = toTextContent(response.content)
      .toLowerCase()
      .trim()
      .replace(/^["']|["']$/g, ""); // Remove quotes if model added them

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
    const sanitizedMessage = sanitizeUserInput(state.userMessage);
    const sanitizedAssistant = sanitizeUserInput(state.assistantMessage);
    const prompt = `Extract ONE key fact or preference learned from this exchange. 
Be specific and concise (max 10 words).

User: "${sanitizedMessage}"
Assistant: "${sanitizedAssistant}"
Intent: ${state.intent}

Examples:
- "User prefers TypeScript over Python"
- "User works in fintech backend systems"
- "User likes concise, bullet-point responses"

Respond with ONLY the extracted fact, nothing else.`;

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
