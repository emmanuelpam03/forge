import "server-only";

import prisma from "@/lib/prisma";
import fetchWithTimeout from "@/lib/fetchWithTimeout";
import type { ImageSearchInput, ImageSearchResult, ProviderImage } from "./image-types";
import { pollinationsGenerateImage } from "./providers/pollinations";
import { serpapiImageSearch } from "./providers/serpapi";
import { pexelsSearch } from "./providers/pexels";
import {
  computeSemanticConfidence,
  filterRelevantImages,
  groundImageSearchQuery,
  rankImages,
} from "@/ai/services/image-ranking";
import { assessSafety } from "@/ai/services/image-safety";

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

type ReadAnyFileInput = {
  chatId: string;
  attachmentId: string;
};

type ImageGenerationInput = {
  prompt: string;
  aspectRatio?: "square" | "landscape" | "portrait";
  style?: string;
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
    // Strict validation: only allow numbers, operators, parentheses, whitespace, and letters (for function names)
    // Specific function name validation happens in the tokenizer
    if (!/^[0-9+\-*/%()^.\sA-Za-z]*$/.test(expression)) {
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
      let dotCount = 0;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === ".") {
          dotCount++;
          if (dotCount > 1) {
            throw new Error(
              `Malformed number: "${num}." contains multiple decimal points`,
            );
          }
        }
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
      if (["sqrt", "abs", "floor", "ceil", "round"].includes(func)) {
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
    if (this.pos < this.tokens.length && this.tokens[this.pos] === "-") {
      this.pos++;
      return -this.parsePower();
    }

    return this.parsePower();
  }

  parsePower(): number {
    let result = this.parsePrimary();

    if (this.pos < this.tokens.length && this.tokens[this.pos] === "^") {
      this.pos++;
      const right = this.parseFactor();
      result = Math.pow(result, right);
    }

    return result;
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
  const tavilyBaseUrl =
    process.env.TAVILY_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://api.tavily.com";
  if (!apiKey) {
    return {
      success: false,
      result: "",
      error:
        "Web search provider is not configured. Set TAVILY_API_KEY to enable live search.",
    };
  }

  // Retry helper with exponential backoff for transient network issues
  async function fetchWithRetries(url: string, opts: RequestInit, retries = 3) {
    let attempt = 0;
    let lastErr: unknown = null;
    while (attempt < retries) {
      try {
        const resp = await fetch(url, opts);
        if (!resp.ok && resp.status >= 500 && attempt < retries - 1) {
          // transient server error, retry
          attempt++;
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
          continue;
        }
        return resp;
      } catch (err) {
        lastErr = err;
        attempt++;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastErr;
  }

  try {
    // Qualify query for freshness (e.g., add year, "today", etc.)
    const qualifiedQuery = qualifyQueryForFreshness(query);
    // Use advanced search depth for current information queries
    const searchDepth = isCurrentInfoQuery(query) ? "advanced" : "basic";

    const body = JSON.stringify({
      api_key: apiKey,
      query: qualifiedQuery,
      max_results: Math.min(Math.max(maxResults, 1), 10),
      search_depth: searchDepth,
      include_answer: true,
    });

    const response = await fetchWithRetries(`${tavilyBaseUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        result: "",
        error: `Web search failed (${response.status}): ${errorText}`,
      };
    }

    const payload = (await response.json().catch(() => ({}))) as {
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

function describeWeatherCode(code: number, isDay: boolean): string {
  const suffix = isDay ? "" : " at night";

  switch (code) {
    case 0:
      return `clear sky${suffix}`;
    case 1:
      return `mainly clear${suffix}`;
    case 2:
      return `partly cloudy${suffix}`;
    case 3:
      return `overcast${suffix}`;
    case 45:
    case 48:
      return `foggy${suffix}`;
    case 51:
    case 53:
    case 55:
      return `light drizzle${suffix}`;
    case 56:
    case 57:
      return `freezing drizzle${suffix}`;
    case 61:
    case 63:
    case 65:
      return `rainy${suffix}`;
    case 66:
    case 67:
      return `freezing rain${suffix}`;
    case 71:
    case 73:
    case 75:
    case 77:
      return `snowing${suffix}`;
    case 80:
    case 81:
    case 82:
      return `rain showers${suffix}`;
    case 85:
    case 86:
      return `snow showers${suffix}`;
    case 95:
      return `thunderstorms${suffix}`;
    case 96:
    case 99:
      return `thunderstorms with hail${suffix}`;
    default:
      return `weather code ${code}${suffix}`;
  }
}

export async function weatherToolAsync(location: string): Promise<ToolResult> {
  const query = location.trim();
  if (!query) {
    return {
      success: false,
      result: "",
      error: "Location cannot be empty",
    };
  }

  try {
    // Prefer OpenWeather when API key is provided for consistent, feature-rich data
    const openWeatherKey = process.env.OPENWEATHER_API_KEY?.trim();
    if (openWeatherKey) {
      const owUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
      owUrl.search = new URLSearchParams({
        q: query,
        appid: openWeatherKey,
        units: "metric",
      }).toString();

      const owResp = await fetchWithTimeout(owUrl.toString());
      if (!owResp.ok) {
        const errText = await owResp.text().catch(() => "");
        return {
          success: false,
          result: "",
          error: `OpenWeather API failed (${owResp.status}): ${errText}`,
        };
      }

      const owJson = await owResp.json().catch(() => null);
      if (!owJson) {
        return {
          success: false,
          result: "",
          error: "OpenWeather returned invalid data",
        };
      }

      const placeLabel = [owJson.name, owJson.sys?.country].filter(Boolean).join(", ");
      const condition = owJson.weather && owJson.weather[0]
        ? String(owJson.weather[0].description)
        : "unknown";
      const temp = typeof owJson.main?.temp === "number" ? `${owJson.main.temp}°C` : "unknown";
      const wind = typeof owJson.wind?.speed === "number" ? `${owJson.wind.speed} m/s` : "unknown";
      const time = owJson.dt ? new Date(owJson.dt * 1000).toISOString() : null;

      return {
        success: true,
        result: [
          `Current weather for ${placeLabel || query}:`,
          `Temperature: ${temp}`,
          `Condition: ${condition}`,
          `Wind: ${wind}`,
          time ? `Observed at: ${time}` : null,
          "Source: OpenWeather",
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: {
          provider: "openweathermap",
          location: placeLabel || query,
        },
      };
    }
    // Primary: Open-Meteo geocoding
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.search = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json",
    }).toString();

    type GeocodeResult = {
      name?: string;
      country?: string;
      admin1?: string;
      latitude?: number;
      longitude?: number;
    };
    type GeocodePayload = { results?: GeocodeResult[] };

    let geocodePayload: GeocodePayload = {};
    const geocodeResponse = await fetchWithTimeout(geocodeUrl.toString()).catch(() => null);
    if (geocodeResponse && geocodeResponse.ok) {
      geocodePayload = (await geocodeResponse.json().catch(() => ({}))) as GeocodePayload;
    }

    let place = geocodePayload.results?.[0];
    // Fallback: Try Nominatim if Open-Meteo geocoding returns nothing
    if (!place) {
      try {
        const nominatim = new URL("https://nominatim.openstreetmap.org/search");
        nominatim.search = new URLSearchParams({
          q: query,
          format: "json",
          limit: "1",
          addressdetails: "0",
        }).toString();

        const nomResp = await fetchWithTimeout(nominatim.toString(), {
          headers: { "User-Agent": "forge/1.0 (contact@example.com)" },
        }).catch(() => null);
        if (nomResp && nomResp.ok) {
          const nomJson = await nomResp.json().catch(() => []);
          const first = nomJson?.[0];
          if (first) {
            place = {
              name: first.display_name,
              country: undefined,
              admin1: undefined,
              latitude: parseFloat(first.lat),
              longitude: parseFloat(first.lon),
            };
          }
        }
      } catch {
        // ignore fallback errors
      }
    }
    if (
      !place ||
      typeof place.latitude !== "number" ||
      typeof place.longitude !== "number"
    ) {
      return {
        success: false,
        result: "",
        error: `Could not find a weather location for "${query}". Try a more specific place name.`,
      };
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.search = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current_weather: "true",
      timezone: "auto",
      forecast_days: "1",
    }).toString();

    const forecastResponse = await fetchWithTimeout(forecastUrl.toString());
    if (!forecastResponse.ok) {
      return {
        success: false,
        result: "",
        error: `Weather forecast failed (${forecastResponse.status})`,
      };
    }

    const forecastPayload = (await forecastResponse.json()) as {
      current_weather?: {
        temperature?: number;
        windspeed?: number;
        winddirection?: number;
        weathercode?: number;
        is_day?: 0 | 1;
        time?: string;
      };
    };

    const current = forecastPayload.current_weather;
    if (!current) {
      return {
        success: false,
        result: "",
        error: `No current weather data returned for "${query}".`,
      };
    }

    const placeLabel = [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ");
    const condition = describeWeatherCode(
      current.weathercode ?? -1,
      current.is_day === 1,
    );

    return {
      success: true,
      result: [
        `Current weather for ${placeLabel || query}:`,
        `Temperature: ${current.temperature ?? "unknown"}°C`,
        `Condition: ${condition}`, 
        `Wind: ${current.windspeed ?? "unknown"} km/h`,
        current.time ? `Observed at: ${current.time}` : null,
        "Source: Open-Meteo",
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: {
        provider: "open-meteo",
        location: placeLabel || query,
      },
    };
  } catch (error) {
    return {
      success: false,
      result: "",
      error: `Weather lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Deprecated helpers: routing and freshness qualification should be
 * handled by the planner/model. Keep minimal stubs to avoid accidental
 * usage elsewhere.
 */
function isCurrentInfoQuery(_text: string): boolean {
  // Planner-driven routing should decide if a query requires fresh info.
  void _text;
  return false;
}

function qualifyQueryForFreshness(originalQuery: string): string {
  // No-op: planner/tool args should provide any necessary temporal context.
  return originalQuery;
}

/**
 * Image search tool: provider-agnostic image retrieval.
 * Queries multiple providers and aggregates ranked, safety-filtered results.
 */
export async function imageSearchToolAsync(
  input: ImageSearchInput,
): Promise<ToolResult> {
  const query = input?.query?.trim();
  if (!query) {
    return { success: false, result: "", error: "Image query cannot be empty" };
  }

  const count = Math.min(Math.max(input.count ?? 6, 1), 20);
  const start = Date.now();
  const grounding = groundImageSearchQuery({ ...input, query });
  const queryVariants = [grounding.query, ...grounding.fallbackQueries].filter(
    (variant, index, all) => variant && all.indexOf(variant) === index,
  );

  async function searchVariant(queryVariant: string) {
    const providerPromises = [
      serpapiImageSearch(queryVariant, count),
      pexelsSearch(queryVariant, count),
    ];

    const settled = await Promise.allSettled(providerPromises);
    const providerImages: ProviderImage[] = settled
      .flatMap((s) => (s.status === "fulfilled" ? s.value : []))
      .slice(0, Math.min(count * 3, 50));

    const ranked = rankImages(providerImages, { ...input, query: queryVariant });
    const safetyMap = assessSafety(ranked);
    const safeRanked = ranked
      .map((im) => ({ ...im, safetyScore: safetyMap[im.id] ?? 0 }))
      .filter((im) => {
        if (input.safeSearch === false) return true;
        return (im.safetyScore ?? 0) >= 0.5;
      });

    const filtered = filterRelevantImages(safeRanked, {
      ...input,
      query: queryVariant,
    });

    return {
      queryVariant,
      images: filtered.slice(0, count),
      semanticConfidence: computeSemanticConfidence(filtered, {
        ...input,
        query: queryVariant,
      }),
    };
  }

  try {
    let images: Awaited<ReturnType<typeof searchVariant>>["images"] = [];
    let semanticConfidence = 0;
    let queryUsed = grounding.query;
    const queryVariantsUsed: string[] = [];

    for (const queryVariant of queryVariants) {
      queryVariantsUsed.push(queryVariant);
      const result = await searchVariant(queryVariant);
      if (
        result.images.length > images.length ||
        result.semanticConfidence > semanticConfidence
      ) {
        images = result.images;
        semanticConfidence = result.semanticConfidence;
        queryUsed = queryVariant;
      }

      if (result.images.length >= Math.max(2, Math.ceil(count * 0.5)) && result.semanticConfidence >= 0.7) {
        break;
      }
    }

    const result: ImageSearchResult = {
      type: "image_group",
      success: true,
      images,
      queryUsed,
      queryVariantsUsed,
      totalFound: images.length,
      retrievalTimeMs: Date.now() - start,
      semanticConfidence,
    };
    // If no images were found, surface a helpful error so the assistant can
    // explain why images aren't available (e.g., missing API keys or no results).
    if (!images || images.length === 0) {
      return {
        success: false,
        result: "",
        error:
          "No images found. Check provider configuration (SERPAPI_API_KEY, PEXELS_API_KEY) or try a different query.",
      };
    }

    return {
      success: true,
      result: JSON.stringify(result),
      metadata: { provider: "multi", count: images.length, queryUsed },
    };
  } catch (err) {
    return { success: false, result: "", error: `Image search failed: ${err instanceof Error ? err.message : String(err)}` };
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
  const { text, maxSentences = 3, format, preserveFacts = true } = input;

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

export async function readAnyFileToolAsync(
  input: ReadAnyFileInput,
): Promise<ToolResult> {
  void input;
  return {
    success: false,
    result: "",
    error: "Attachment reading is no longer supported.",
  };
}

export async function pollinationsImageGenerationToolAsync(
  input: ImageGenerationInput,
): Promise<ToolResult> {
  try {
    const generated = await pollinationsGenerateImage(input);
    return {
      success: true,
      result: JSON.stringify(
        {
          success: true,
          provider: generated.provider,
          promptUsed: generated.promptUsed,
          images: generated.images,
          totalFound: generated.images.length,
          retrievalTimeMs: generated.retrievalTimeMs,
        },
        null,
        2,
      ),
      metadata: {
        provider: generated.provider,
        promptUsed: generated.promptUsed,
        imageCount: generated.images.length,
        retrievalTimeMs: generated.retrievalTimeMs,
      },
    };
  } catch (error) {
    return {
      success: false,
      result: "",
      error: error instanceof Error ? error.message : "Image generation failed.",
    };
  }
}

/**
 * Execute tool by intent and return result
 */
export async function executeToolByIntent(
  _intent: string,
  _userMessage: string,
): Promise<{ toolsRun: string[]; toolResults: Record<string, ToolResult> }> {
  // Legacy heuristic routing removed.
  // Tool execution must be driven by the planner using structured
  // `tool_usage` produced by the intent classifier. Return a clear
  // indicator so callers know to use the planner path.
  const toolResults: Record<string, ToolResult> = {
    planner_required: {
      success: false,
      result: "",
      error:
        "Legacy executeToolByIntent heuristics removed. Use planner-driven tool routing with structured tool_usage.",
    },
  };

  void _intent;
  void _userMessage;
  return { toolsRun: [], toolResults };
}
