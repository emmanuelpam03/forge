import "server-only";

import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type AIMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import prisma from "@/lib/prisma";
import { createGeminiModel, createGeminiToolModel } from "@/ai/models";
import { buildChatMessages } from "@/ai/prompts/router";
import { buildIntentClassificationMessage } from "@/ai/prompts/intent";
import { loadChatContext } from "@/ai/memory/extractor";
import { createForgeTools } from "@/ai/tools";
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

export async function loadContextNode(state: ChatGraphState) {
  const context = await loadChatContext(state.chatId);

  return {
    previousMessages: context.previousMessages,
    preferences: context.preferences,
    memorySummary: context.memorySummary,
  };
}

export async function generateResponseNode(state: ChatGraphState) {
  const model = createGeminiModel();
  const messages = buildChatMessages(state);
  const startedAt = Date.now();
  const response = (await model.invoke(messages as BaseMessage[])) as AIMessage;
  const assistantMessage = toTextContent(response.content);
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

  await prisma.$transaction(async (tx) => {
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

    await tx.chat.update({
      where: { id: state.chatId },
      data: {
        lastMessageAt: now,
      },
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
  });

  return {
    traceId: state.traceId,
  };
}

/**
 * Phase 2 Nodes: Intent classification, tool execution, title generation, memory extraction
 */

/**
 * Classify user intent
 * Input: userMessage + context
 * Output: intent field
 */
export async function classifyIntentNode(state: ChatGraphState) {
  try {
    const model = createGeminiModel();
    const message = buildIntentClassificationMessage(state.userMessage);

    const response = await model.invoke([new HumanMessage(message)]);
    const intent = toTextContent(response.content).toLowerCase().trim();

    // Validate intent is one of the expected types
    const validIntents = [
      "calculation",
      "datetime-query",
      "code-request",
      "information-search",
      "chat",
    ];
    const classifiedIntent = validIntents.includes(intent) ? intent : "chat";

    return {
      intent: classifiedIntent,
    };
  } catch (error) {
    console.error("Intent classification failed:", error);
    return {
      intent: "chat", // Fallback to general chat
    };
  }
}

/**
 * Execute tools based on intent
 * Input: intent + userMessage
 * Output: toolsUsed
 */
export async function optionalToolNode(state: ChatGraphState) {
  try {
    const tools = createForgeTools({ chatId: state.chatId });
    const modelWithTools = createGeminiToolModel(tools).withConfig({
      runName: "forge-tool-loop",
      tags: ["forge", "tools"],
      metadata: {
        chatId: state.chatId,
        intent: state.intent,
      },
    });

    const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
    const toolContextLines: string[] = [];
    const usedTools = new Set<string>();

    const loopMessages: BaseMessage[] = [
      new SystemMessage(`You are a tool router for Forge.
Use tools when they improve factual correctness or precision.
Available tools: calculator, currentDateTime, webSearch, summarizeText, projectContextLookup.
If a tool is unnecessary, respond without tool calls.`),
      new HumanMessage(
        `Intent: ${state.intent}\nUser message: ${state.userMessage}`,
      ),
    ];

    for (let step = 0; step < 3; step += 1) {
      const toolDecision = (await modelWithTools.invoke(
        loopMessages,
      )) as AIMessage;
      loopMessages.push(toolDecision);

      const toolCalls = toolDecision.tool_calls ?? [];
      if (toolCalls.length === 0) {
        break;
      }

      for (const toolCall of toolCalls) {
        const tool = toolByName.get(toolCall.name);
        if (!tool) {
          continue;
        }

        const rawResult = await tool.invoke(
          (toolCall.args ?? {}) as Record<string, unknown>,
        );
        const toolResultText =
          typeof rawResult === "string"
            ? rawResult
            : JSON.stringify(rawResult, null, 2);

        usedTools.add(toolCall.name);
        toolContextLines.push(`Tool: ${toolCall.name}\n${toolResultText}`);

        loopMessages.push(
          new ToolMessage({
            content: toolResultText,
            tool_call_id:
              toolCall.id || `${toolCall.name}-${Date.now().toString()}`,
          }),
        );
      }
    }

    return {
      toolsUsed: Array.from(usedTools),
      toolContext: toolContextLines.join("\n\n"),
    };
  } catch (error) {
    console.error("Tool execution failed:", error);
    return {
      toolsUsed: [],
      toolContext: "",
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
    const prompt = `Generate a short, 3–7 word chat title based on this exchange:

User: "${state.userMessage}"
Assistant: "${state.assistantMessage}"

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
    const prompt = `Extract ONE key fact or preference learned from this exchange. 
Be specific and concise (max 10 words).

User: "${state.userMessage}"
Assistant: "${state.assistantMessage}"
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
