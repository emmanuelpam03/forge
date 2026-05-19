﻿import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { assertLangSmithConfig } from "@/lib/langsmith";
import { warn } from "@/lib/logger";

export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export type ChatModelProvider = "openrouter";

export type ChatModelConfig = {
  provider: "openrouter";
  model: string;
  baseUrl: string;
};

export type ModelOverride = {
  model?: string;
  provider?: ChatModelProvider;
};





/**
 * Get chat model configuration. DeepSeek only.
 */
export function getChatModelConfig(override?: ModelOverride): ChatModelConfig {
  return {
    provider: "openrouter",
    model: override?.model || DEFAULT_MODEL,
    baseUrl:
      process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
  };
}

// Validate OpenRouter config is present
function assertModelEnv() {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    warn("missing_openrouter_key", {
      message: "OPENROUTER_API_KEY not set. DeepSeek model will not function.",
    });
  }
}





export function createModel(override?: ModelOverride) {
  assertLangSmithConfig();
  assertModelEnv();
  const config = getChatModelConfig(override);

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for DeepSeek inference.");
  }

  return new ChatOpenAI({
    apiKey,
    model: config.model,
    temperature: 0.7,
    maxRetries: 2,
    configuration: {
      baseURL: config.baseUrl,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER?.trim() || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_TITLE?.trim() || "Forge",
      },
    },
  });
}

/**
 * Create model with tools bound. DeepSeek via OpenRouter.
 */
export function createModelWithTools(
  tools: DynamicStructuredTool[],
  override?: ModelOverride,
) {
  return createModel(override).bindTools(tools);
}

/**
 * Alias for backwards compatibility with nodes.ts and other modules.
 * New code should use createModel() directly.
 */
export function createGeminiModel(override?: ModelOverride) {
  return createModel(override);
}

/**
 * Alias for backwards compatibility.
 * New code should use createModelWithTools() directly.
 */
export function createGeminiToolModel(
  tools: DynamicStructuredTool[],
  override?: ModelOverride,
) {
  return createModelWithTools(tools, override);
}
