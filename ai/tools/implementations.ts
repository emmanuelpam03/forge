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
 * Calculator tool: Evaluates safe mathematical expressions
 * Uses a recursive descent parser to safely evaluate math expressions.
 * Supports: +, -, *, /, %, ^, parentheses, sqrt(), abs(), floor(), ceil(), round()
 * Does NOT support: function calls (except predefined), variable access, string operations
 */
export function calculatorTool(expression: string): ToolResult {
  try {
    // Strict validation: only allow numbers, operators, parentheses, whitespace, and function names
    if (
      !/^[0-9+\-*/%()^.\s(sqrt|abs|floor|ceil|round|pow|min|max)]*$/.test(
        expression,
      )
    ) {
      return {
        success: false,
        result: "",
        error:
          "Invalid characters in expression. Only basic math operations allowed.",
      };
    }

    const result = evaluateSafeExpression(expression);

    if (!Number.isFinite(result)) {
      return {
        success: false,
        result: "",
        error: "Calculation resulted in invalid number (NaN or Infinity)",
      };
    }

    // Return with appropriate precision
    return {
      success: true,
      result: result.toFixed(10).replace(/\.?0+$/, ""), // Remove trailing zeros
    };
  } catch (error) {
    return {
      success: false,
      result: "",
      error: `Calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Safe recursive descent parser for mathematical expressions.
 * Grammar: expression := term (('+' | '-') term)*
 *          term := factor (('*' | '/' | '%') factor)*
 *          factor := power (('^') power)*
 *          power := unary
 *          unary := ('-' unary) | primary
 *          primary := '(' expression ')' | number | function call
 */
function evaluateSafeExpression(expr: string): number {
  const tokens = tokenizeExpression(expr);
  const parser = new Parser(tokens);
  return parser.parseExpression();
}

function tokenizeExpression(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  expr = expr.trim();

  while (i < expr.length) {
    if (/\s/.test(expr[i])) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(expr[i])) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push(num);
    } else if (/[a-z]/i.test(expr[i])) {
      let func = "";
      while (i < expr.length && /[a-z]/i.test(expr[i])) {
        func += expr[i];
        i++;
      }
      if (
        ["sqrt", "abs", "floor", "ceil", "round", "pow", "min", "max"].includes(
          func,
        )
      ) {
        tokens.push(func);
      } else {
        throw new Error(`Unknown function: ${func}`);
      }
    } else if (/[+\-*/%()^]/.test(expr[i])) {
      tokens.push(expr[i]);
      i++;
    } else {
      throw new Error(`Unexpected character: ${expr[i]}`);
    }
  }

  return tokens;
}

class Parser {
  tokens: string[];
  pos: number = 0;

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  parseExpression(): number {
    let result = this.parseTerm();

    while (
      this.pos < this.tokens.length &&
      (this.tokens[this.pos] === "+" || this.tokens[this.pos] === "-")
    ) {
      const op = this.tokens[this.pos];
      this.pos++;
      const right = this.parseTerm();
      result = op === "+" ? result + right : result - right;
    }

    return result;
  }

  parseTerm(): number {
    let result = this.parseFactor();

    while (
      this.pos < this.tokens.length &&
      (this.tokens[this.pos] === "*" ||
        this.tokens[this.pos] === "/" ||
        this.tokens[this.pos] === "%")
    ) {
      const op = this.tokens[this.pos];
      this.pos++;
      const right = this.parseFactor();
      if (op === "*") result = result * right;
      else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        result = result / right;
      } else result = result % right;
    }

    return result;
  }

  parseFactor(): number {
    let result = this.parsePower();

    while (this.pos < this.tokens.length && this.tokens[this.pos] === "^") {
      this.pos++;
      const right = this.parsePower();
      result = Math.pow(result, right);
    }

    return result;
  }

  parsePower(): number {
    if (this.pos < this.tokens.length && this.tokens[this.pos] === "-") {
      this.pos++;
      return -this.parsePower();
    }

    return this.parsePrimary();
  }

  parsePrimary(): number {
    if (this.pos >= this.tokens.length) {
      throw new Error("Unexpected end of expression");
    }

    const token = this.tokens[this.pos];

    // Handle function calls
    if (["sqrt", "abs", "floor", "ceil", "round"].includes(token)) {
      this.pos++;
      if (this.pos >= this.tokens.length || this.tokens[this.pos] !== "(") {
        throw new Error(`Function ${token} requires parentheses`);
      }
      this.pos++;
      const arg = this.parseExpression();
      if (this.pos >= this.tokens.length || this.tokens[this.pos] !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      this.pos++;

      switch (token) {
        case "sqrt":
          return Math.sqrt(arg);
        case "abs":
          return Math.abs(arg);
        case "floor":
          return Math.floor(arg);
        case "ceil":
          return Math.ceil(arg);
        case "round":
          return Math.round(arg);
      }
    }

    // Handle parenthesized expression
    if (token === "(") {
      this.pos++;
      const result = this.parseExpression();
      if (this.pos >= this.tokens.length || this.tokens[this.pos] !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      this.pos++;
      return result;
    }

    // Handle number
    if (/^[0-9.]+$/.test(token)) {
      this.pos++;
      const num = parseFloat(token);
      if (!Number.isFinite(num)) {
        throw new Error(`Invalid number: ${token}`);
      }
      return num;
    }

    throw new Error(`Unexpected token: ${token}`);
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
 * Detect if a query is asking for current/dynamic information
 * Examples: president, stock price, bitcoin, latest, current, today, now, weather
 */
function isCurrentInfoQuery(text: string): boolean {
  const dynamicPatterns = [
    /\b(who|what|current|latest|today|now|recent|trending|president|stock|price|btc|crypto|weather|news|release|earnings|rank|top|best)\b/i,
  ];
  return dynamicPatterns.some((p) => p.test(text));
}

/**
 * Qualify query for freshness: auto-add year/month for time-sensitive queries
 * Example: "president" → "president of the US 2025"
 */
function qualifyQueryForFreshness(originalQuery: string): string {
  if (!isCurrentInfoQuery(originalQuery)) {
    return originalQuery;
  }

  // Add year context if not already present
  const year = new Date().getFullYear();
  if (!originalQuery.toLowerCase().includes(String(year))) {
    // For president/leader questions, add location + year
    if (/president|leader|prime minister|governor/i.test(originalQuery)) {
      return `${originalQuery} ${year}`;
    }
    // For price/market questions, add "today" or current year
    if (/price|market|cost|value|rate/i.test(originalQuery)) {
      return `${originalQuery} today`;
    }
  }

  return originalQuery;
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
    // Qualify query for freshness (e.g., add year, "today", etc.)
    const qualifiedQuery = qualifyQueryForFreshness(query);
    // Use advanced search depth for current information queries
    const searchDepth = isCurrentInfoQuery(query) ? "advanced" : "basic";

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: qualifiedQuery,
        max_results: Math.min(Math.max(maxResults, 1), 10),
        search_depth: searchDepth,
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

export type SummarizeInput = {
  text: string;
  maxSentences?: number;
  format?:
    | "sentence"
    | "bullets"
    | "executive"
    | "technical"
    | "beginner"
    | "action_items"
    | "paragraph";
  audience?: string;
  purpose?: string;
  preserveFacts?: boolean;
};

export function summarizeTextTool(input: SummarizeInput): ToolResult {
  const {
    text,
    maxSentences = 3,
    format,
    audience,
    purpose,
    preserveFacts = true,
  } = input;

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      result: "",
      error: "Text cannot be empty",
    };
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);

  // Helper extractors
  const numbers = Array.from(
    cleaned.matchAll(/\b\d+(?:[.,]\d+)?%?|\$\d+(?:[.,]\d+)?\b/g),
  ).map((m) => m[0]);
  const dates = Array.from(
    cleaned.matchAll(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s\d,]+|\b\d{4}-\d{2}-\d{2}\b/g,
    ),
  ).map((m) => m[0]);
  const facts: string[] = [];
  if (preserveFacts) {
    facts.push(...numbers.slice(0, 6));
    facts.push(...dates.slice(0, 3));
  }

  const isMeeting = /meeting|minutes|decisions|attendees|next steps/i.test(
    cleaned,
  );
  const isResearch =
    /study|method|methods|findings|participants|results|we report|we found/i.test(
      cleaned,
    );
  const isNews =
    /reported|announced|released|breaking|today|yesterday|update/i.test(
      cleaned,
    );

  const chooseFormat =
    format ??
    (isMeeting
      ? "action_items"
      : isResearch
        ? "executive"
        : isNews
          ? "bullets"
          : cleaned.length < 300
            ? "paragraph"
            : "bullets");

  function takeTop(n: number) {
    return sentences.slice(0, n).map((s) => s.trim());
  }

  let result = "";
  const metadata: Record<string, unknown> = { sentenceCount: sentences.length };

  switch (chooseFormat) {
    case "sentence":
      result = sentences[0] || cleaned.slice(0, 300);
      metadata.returned = 1;
      break;

    case "paragraph":
      {
        const top = takeTop(Math.min(maxSentences, 4));
        result = top.join(" ");
        metadata.returned = top.length;
      }
      break;
    case "bullets":
      {
        const count = Math.min(Math.max(3, maxSentences), 12);
        const top = takeTop(count);
        const points = top.map((s) => `- ${s}`);
        result = points.join("\n");
        metadata.returned = top.length;
      }
      break;

    case "executive":
      {
        const top = takeTop(Math.min(6, Math.max(3, maxSentences)));
        const takeaway = top.slice(0, 2).join(" ");
        const bullets = top.map((s) => `- ${s}`);
        result = `Executive summary:\n${bullets.join("\n\n")}\n\nKey takeaway: ${takeaway}`;
        metadata.returned = top.length;
      }
      break;

    case "technical":
      {
        const top = takeTop(Math.min(8, Math.max(3, maxSentences)));
        // Attempt to surface method/findings lines
        const methods = top.filter((s) =>
          /method|approach|implementation|algorithm|protocol/i.test(s),
        );
        const findings = top.filter((s) =>
          /result|finding|show|demonstrate|observed|significant/i.test(s),
        );
        const sections = [] as string[];
        if (methods.length)
          sections.push(`Methods:\n- ${methods.join("\n- ")}`);
        if (findings.length)
          sections.push(`Findings:\n- ${findings.join("\n- ")}`);
        if (!sections.length) sections.push(...top.map((s) => `- ${s}`));
        result = sections.join("\n\n");
        metadata.returned = top.length;
      }
      break;

    case "beginner":
      {
        const top = takeTop(Math.min(6, Math.max(2, maxSentences)));
        const simple = top.map(
          (s) =>
            `- ${s.replace(/\b(e.g.|i.e.|\bImplementation|protocol)\b/gi, "").trim()}`,
        );
        result = `Beginner summary:\n${simple.join("\n")}`;
        metadata.returned = top.length;
      }
      break;

    case "action_items":
      {
        // Find imperative sentences or decision markers
        const candidates = sentences.filter((s) =>
          /\b(should|need to|must|will|action|todo|next steps|decide|decision)\b/i.test(
            s,
          ),
        );
        const items = (
          candidates.length ? candidates : takeTop(Math.min(6, maxSentences))
        ).map((s) => `- ${s.replace(/^\s*-?\s*/, "")}`);
        result = `Action items:\n${items.join("\n")}`;
        metadata.returned = items.length;
      }
      break;

    default:
      {
        const top = takeTop(Math.min(maxSentences, 4));
        result = top.join(" ");
        metadata.returned = top.length;
      }
      break;
  }

  // Attach preserved facts if any and not already present in result
  if (preserveFacts && facts.length > 0) {
    const factSection = facts.filter((f) => !result.includes(f)).slice(0, 6);
    if (factSection.length) {
      result = `${result}\n\nKey facts: ${factSection.join(", ")}`;
      metadata.keyFacts = factSection;
    }
  }

  return {
    success: true,
    result: result.trim(),
    metadata,
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
