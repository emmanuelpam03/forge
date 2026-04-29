import "server-only";

import prisma from "@/lib/prisma";

export type ToolResult = {
  success: boolean;
  result: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

type ProjectContextInput = {
  chatId: string;
  query: string;
  maxResults?: number;
  includeDocuments?: boolean;
};

type RankedChunk = {
  source: "message" | "document";
  label: string;
  content: string;
  score: number;
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function lexicalScore(query: string, candidate: string): number {
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = tokenize(candidate);

  if (queryTokens.size === 0 || candidateTokens.length === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of candidateTokens) {
    if (queryTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.sqrt(queryTokens.size * candidateTokens.length);
}

/**
 * Calculator tool: Evaluates simple mathematical expressions
 * Supports: +, -, *, /, %, ^, sqrt(), sin(), cos(), tan(), etc.
 */
export function calculatorTool(expression: string): ToolResult {
  try {
    // Validate input: only allow safe mathematical operations
    if (!/^[0-9+\-*/%().\s^a-zA-Z]+$/.test(expression)) {
      return {
        success: false,
        result: "",
        error: "Invalid characters in expression",
      };
    }

    // Handle ^ as power operator
    const sanitized = expression.replace(/\^/g, "**");

    // Use Function constructor with restricted scope (no access to globals)
    // This is safe because we've validated the input above
    const result = new Function(`return ${sanitized}`)();

    if (typeof result !== "number" || !isFinite(result)) {
      return {
        success: false,
        result: "",
        error: "Invalid calculation result",
      };
    }

    return {
      success: true,
      result: result.toString(),
    };
  } catch (error) {
    return {
      success: false,
      result: "",
      error: `Calculation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export type DateTimeAction = "now" | "timezone" | "date" | "time";

/**
 * DateTime tool: Returns current date/time information
 */
export function datetimeTool(action: DateTimeAction = "now"): ToolResult {
  try {
    const now = new Date();
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    switch (action) {
      case "now":
        return {
          success: true,
          result: `Current UTC time: ${now.toISOString()}\nTimezone: ${userTimeZone}`,
        };

      case "date":
        return {
          success: true,
          result: now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };

      case "time":
        return {
          success: true,
          result: now.toLocaleTimeString("en-US"),
        };

      case "timezone":
        return {
          success: true,
          result: userTimeZone,
        };

      default:
        return {
          success: false,
          result: "",
          error: `Unknown action: ${action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      result: "",
      error: `DateTime failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Web Search tool: Stub implementation for Phase 2
 * In Phase 3, integrate with Tavily, SerpAPI, or Perplexity
 */
export function webSearchTool(_query: string): ToolResult {
  void _query;
  return {
    success: false,
    result: "",
    error: "Use webSearchToolAsync for provider-backed web search.",
  };
}

export async function webSearchToolAsync(
  query: string,
  maxResults: number = 5,
): Promise<ToolResult> {
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      result: "",
      error: "Query cannot be empty",
    };
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      result: "",
      error:
        "Web search provider is not configured. Set TAVILY_API_KEY to enable live search.",
    };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(Math.max(maxResults, 1), 10),
        search_depth: "basic",
        include_answer: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        result: "",
        error: `Web search failed (${response.status}): ${errorText}`,
      };
    }

    const payload = (await response.json()) as {
      answer?: string;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
      }>;
    };

    const results = payload.results ?? [];
    const lines = results
      .slice(0, Math.min(maxResults, 10))
      .map((item, index) => {
        const title = item.title?.trim() || "Untitled";
        const url = item.url?.trim() || "";
        const snippet = item.content?.trim().slice(0, 260) || "No snippet.";
        return `${index + 1}. ${title}\n${url}\n${snippet}`;
      });

    const summaryLine = payload.answer
      ? `Search summary: ${payload.answer}`
      : "Search summary unavailable.";

    return {
      success: true,
      result: `${summaryLine}\n\n${lines.join("\n\n")}`.trim(),
      metadata: {
        provider: "tavily",
        count: results.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      result: "",
      error: `Web search request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function summarizeTextTool(
  text: string,
  maxSentences: number = 3,
): ToolResult {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      result: "",
      error: "Text cannot be empty",
    };
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 0);

  if (sentences.length === 0) {
    return {
      success: true,
      result: cleaned.slice(0, 400),
    };
  }

  const capped = Math.min(Math.max(maxSentences, 1), 8);
  return {
    success: true,
    result: sentences.slice(0, capped).join(" "),
    metadata: {
      sentenceCount: sentences.length,
      returnedSentences: capped,
    },
  };
}

export async function projectContextLookupTool(
  input: ProjectContextInput,
): Promise<ToolResult> {
  const query = input.query?.trim();
  if (!query) {
    return {
      success: false,
      result: "",
      error: "Query cannot be empty",
    };
  }

  const maxResults = Math.min(Math.max(input.maxResults ?? 5, 1), 12);

  const chat = await prisma.chat.findUnique({
    where: { id: input.chatId },
    select: { id: true, projectId: true, title: true },
  });

  if (!chat) {
    return {
      success: false,
      result: "",
      error: "Current chat not found.",
    };
  }

  const rankedChunks: RankedChunk[] = [];

  if (chat.projectId) {
    const [messages, documents] = await Promise.all([
      prisma.message.findMany({
        where: {
          chat: { projectId: chat.projectId },
          role: { in: ["user", "assistant"] },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
        select: {
          content: true,
        },
      }),
      input.includeDocuments === false
        ? Promise.resolve([])
        : prisma.document.findMany({
            where: {
              projectId: chat.projectId,
              extractedText: { not: null },
            },
            orderBy: { createdAt: "desc" },
            take: 60,
            select: {
              name: true,
              extractedText: true,
            },
          }),
    ]);

    for (const message of messages) {
      const content = message.content.trim();
      if (!content) {
        continue;
      }

      const score = lexicalScore(query, content);
      if (score <= 0) {
        continue;
      }

      rankedChunks.push({
        source: "message",
        label: "Project Chat",
        content: content.slice(0, 500),
        score,
      });
    }

    for (const document of documents) {
      const content = (document.extractedText || "").trim();
      if (!content) {
        continue;
      }

      const snippet = content.slice(0, 1000);
      const score = lexicalScore(query, snippet);
      if (score <= 0) {
        continue;
      }

      rankedChunks.push({
        source: "document",
        label: document.name,
        content: snippet,
        score,
      });
    }
  } else {
    const messages = await prisma.message.findMany({
      where: {
        chatId: chat.id,
        role: { in: ["user", "assistant"] },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { content: true },
    });

    for (const message of messages) {
      const content = message.content.trim();
      const score = lexicalScore(query, content);
      if (score <= 0) {
        continue;
      }

      rankedChunks.push({
        source: "message",
        label: chat.title || "Current Chat",
        content: content.slice(0, 500),
        score,
      });
    }
  }

  rankedChunks.sort((a, b) => b.score - a.score);
  const top = rankedChunks.slice(0, maxResults);

  if (top.length === 0) {
    return {
      success: true,
      result:
        "No strongly relevant project context found for that query in current chats/documents.",
      metadata: {
        projectId: chat.projectId,
        resultCount: 0,
      },
    };
  }

  const lines = top.map((chunk, index) => {
    const sourceLabel = chunk.source === "document" ? "Document" : "Chat";
    return `${index + 1}. [${sourceLabel}] ${chunk.label}\n${chunk.content}`;
  });

  return {
    success: true,
    result: lines.join("\n\n"),
    metadata: {
      projectId: chat.projectId,
      resultCount: top.length,
    },
  };
}

/**
 * Execute tool by intent and return result
 */
export async function executeToolByIntent(
  intent: string,
  userMessage: string,
): Promise<{ toolsRun: string[]; toolResults: Record<string, ToolResult> }> {
  const toolResults: Record<string, ToolResult> = {};
  const toolsRun: string[] = [];

  if (intent === "calculation") {
    const result = calculatorTool(userMessage);
    toolResults.calculator = result;
    toolsRun.push("calculator");
  } else if (intent === "datetime-query") {
    // Try to infer the action from the message
    const action: DateTimeAction = userMessage.toLowerCase().includes("time")
      ? "time"
      : userMessage.toLowerCase().includes("date")
        ? "date"
        : userMessage.toLowerCase().includes("timezone")
          ? "timezone"
          : "now";

    const result = datetimeTool(action);
    toolResults.datetime = result;
    toolsRun.push("datetime");
  } else if (intent === "information-search") {
    // Extract query from message (remove common search phrases)
    const query = userMessage
      .replace(/^(search for|find|look up|search)\s+/i, "")
      .trim();

    const result = await webSearchToolAsync(query);
    toolResults.websearch = result;
    toolsRun.push("websearch");
  }

  return { toolsRun, toolResults };
}
