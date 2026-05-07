import "server-only";

import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { assertLangSmithConfig } from "@/lib/langsmith";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b-instruct";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

export type ChatModelProvider = "google-genai" | "ollama";

export type ChatModelConfig =
  | {
      provider: "google-genai";
      model: string;
    }
  | {
      provider: "ollama";
      model: string;
      baseUrl: string;
    };

export type ModelOverride = {
  model?: string;
  provider?: ChatModelProvider;
};

// Native client for true streaming when Gemini is selected.
let nativeClient: GoogleGenerativeAI | null = null;

function getNativeClient(): GoogleGenerativeAI {
  if (!nativeClient) {
    const apiKey = process.env.GOOGLE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is required for the Gemini provider.");
    }
    nativeClient = new GoogleGenerativeAI(apiKey);
  }
  return nativeClient;
}

/**
 * Infer provider from model name if provider is not explicitly specified.
 * Models starting with "gemini" map to google-genai; others default to ollama.
 */
function inferProviderFromModel(modelName: string): ChatModelProvider {
  if (modelName.toLowerCase().startsWith("gemini")) {
    return "google-genai";
  }
  return "ollama";
}

/**
 * Get chat model configuration with support for optional overrides.
 * If override is provided with model/provider, it takes precedence over env vars.
 */
export function getChatModelConfig(override?: ModelOverride): ChatModelConfig {
  // If override model is provided but provider is not, infer provider from model name
  if (override?.model && !override?.provider) {
    override = {
      ...override,
      provider: inferProviderFromModel(override.model),
    };
  }

  // Use override provider if provided, otherwise read from env
  const provider = override?.provider ||  
    (process.env.AI_MODEL_PROVIDER?.trim().toLowerCase() === "ollama"
      ? "ollama"
      : "google-genai");

  if (provider === "ollama") {
    return {
      provider,
      model: override?.model || process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL,
      baseUrl: process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL,
    };
  }

  return {
    provider,
    model: override?.model || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  };
}

export function getChatModelConfig_OLD(): ChatModelConfig {
  const provider =
    process.env.AI_MODEL_PROVIDER?.trim().toLowerCase() === "ollama"
      ? "ollama"
      : "google-genai";

  if (provider === "ollama") {
    return {
      provider,
      model: process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL,
      baseUrl: process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL,
    };
  }

  return {
    provider,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  };
}

function extractTextFromPart(part: unknown): string {
  if (typeof part === "string") {
    return part;
  }

  if (!part || typeof part !== "object") {
    return "";
  }

  const candidate = part as { text?: unknown; content?: unknown };

  if (typeof candidate.text === "string") {
    return candidate.text;
  }

  if (typeof candidate.content === "string") {
    return candidate.content;
  }

  return "";
}

export function extractTextFromModelChunk(chunk: unknown): string {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (!chunk || typeof chunk !== "object") {
    return "";
  }

  const candidate = chunk as {
    text?: unknown;
    content?: unknown;
    parts?: unknown;
    additional_kwargs?: { content?: unknown };
  };

  if (typeof candidate.text === "string") {
    return candidate.text;
  }

  if (typeof candidate.content === "string") {
    return candidate.content;
  }

  if (Array.isArray(candidate.content)) {
    return candidate.content.map(extractTextFromPart).join("");
  }

  if (candidate.content && typeof candidate.content === "object") {
    const contentObject = candidate.content as {
      text?: unknown;
      content?: unknown;
      parts?: unknown;
    };

    if (typeof contentObject.text === "string") {
      return contentObject.text;
    }

    if (typeof contentObject.content === "string") {
      return contentObject.content;
    }

    if (Array.isArray(contentObject.parts)) {
      return contentObject.parts.map(extractTextFromPart).join("");
    }
  }

  if (Array.isArray(candidate.parts)) {
    return candidate.parts.map(extractTextFromPart).join("");
  }

  if (candidate.additional_kwargs?.content) {
    const additionalContent = candidate.additional_kwargs.content;
    if (typeof additionalContent === "string") {
      return additionalContent;
    }
    if (Array.isArray(additionalContent)) {
      return additionalContent.map(extractTextFromPart).join("");
    }
  }

  return "";
}

export function createGeminiModel(override?: ModelOverride) {
  assertLangSmithConfig();
  const config = getChatModelConfig(override);

  if (config.provider === "ollama") {
    const apiKey = process.env.OLLAMA_API_KEY?.trim();
    const ollamaOpts: ConstructorParameters<typeof ChatOllama>[0] = {
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: 0.7,
      maxRetries: 2,
      ...(apiKey
        ? {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        : {}),
    };

    return new ChatOllama(ollamaOpts);
  }

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is required for the Gemini provider.");
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: config.model,
    temperature: 0.7,
    maxRetries: 2,
  });

  // Attach native streaming method to model
  const modelWithNativeStream = model as unknown as Record<string, unknown>;
  modelWithNativeStream.nativeStream = async function (
    messages: BaseMessage[],
  ) {
    const nativeModel = getNativeClient().getGenerativeModel({
      model: config.model,
    });

    // Extract system message and filter it out from contents
    let systemInstruction = "";
    const userMessages: BaseMessage[] = [];

    for (const msg of messages) {
      if (msg instanceof SystemMessage) {
        systemInstruction = msg.content as string;
      } else {
        userMessages.push(msg);
      }
    }

    // Convert LangChain messages to native format (excluding system messages)
    const contents: Content[] = userMessages.map((msg: BaseMessage) => ({
      role: msg._getType() === "ai" ? "model" : "user",
      parts: [{ text: msg.content as string }],
    }));

    // Use native streaming with generateContentStream and return the actual
    // chunk iterator so callers can forward tokens as they arrive.
    const stream = await nativeModel.generateContentStream({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.7,
      },
    });

    return stream.stream;
  };

  return model;
}

export function createGeminiToolModel(
  tools: DynamicStructuredTool[],
  override?: ModelOverride,
) {
  return createGeminiModel(override).bindTools(tools);
}
