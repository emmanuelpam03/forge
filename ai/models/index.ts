import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { assertLangSmithConfig } from "@/lib/langsmith";
import { info, warn } from "@/lib/logger";
import type { UploadedAttachment } from "@/lib/attachment-types";

export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
export const DEFAULT_OPENROUTER_MAX_COMPLETION_TOKENS = 4096;
export const MAX_OPENROUTER_MAX_COMPLETION_TOKENS = 4096;

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





export function chatHasImageAttachments(
  attachments: UploadedAttachment[] | undefined,
): boolean {
  return (attachments ?? []).some(
    (attachment) =>
      attachment.status !== "failed" &&
      (attachment.kind === "image" ||
        (attachment.mimeType ?? "").startsWith("image/")),
  );
}

/**
 * Default text chat model (DeepSeek via OpenRouter).
 */
export function getChatModelConfig(override?: ModelOverride): ChatModelConfig {
  return {
    provider: "openrouter",
    model: override?.model?.trim() || DEFAULT_MODEL,
    baseUrl:
      process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
  };
}

export type ResolveChatModelOptions = {
  hasImageAttachments?: boolean;
};

/**
 * Pick the model for a chat turn.
 */
export function resolveChatModelConfig(
  override?: ModelOverride,
  options?: ResolveChatModelOptions,
): ChatModelConfig {
  void options;
  return getChatModelConfig(override);
}

// Validate OpenRouter config is present
function assertModelEnv() {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    warn("missing_openrouter_key", {
      message: "OPENROUTER_API_KEY not set. DeepSeek model will not function.",
    });
  }
}





export function createModel(
  override?: ModelOverride,
  options?: ResolveChatModelOptions,
) {
  assertLangSmithConfig();
  assertModelEnv();
  const config = resolveChatModelConfig(override, options);

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for DeepSeek inference.");
  }

  const maxTokensEnv = process.env.OPENROUTER_MAX_COMPLETION_TOKENS?.trim();
  const parsedMaxTokens =
    maxTokensEnv && Number.isFinite(Number.parseInt(maxTokensEnv, 10))
      ? Number.parseInt(maxTokensEnv, 10)
      : DEFAULT_OPENROUTER_MAX_COMPLETION_TOKENS;

  const maxTokens = Math.max(
    1,
    Math.min(parsedMaxTokens, MAX_OPENROUTER_MAX_COMPLETION_TOKENS),
  );

  if (parsedMaxTokens !== maxTokens) {
    warn("openrouter_max_tokens_clamped", {
      configuredMaxTokens: parsedMaxTokens,
      clampedMaxTokens: maxTokens,
      maximumAllowed: MAX_OPENROUTER_MAX_COMPLETION_TOKENS,
    });
  }
  info("openrouter_max_tokens", { maxTokens });

  return new ChatOpenAI({
    apiKey,
    model: config.model,
    temperature: 0.7,
    maxRetries: 2,
    maxTokens,
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
  options?: ResolveChatModelOptions,
) {
  return createModel(override, options).bindTools(tools);
}

/**
 * Alias for backwards compatibility with nodes.ts and other modules.
 * New code should use createModel() directly.
 */
export function createGeminiModel(
  override?: ModelOverride,
  options?: ResolveChatModelOptions,
) {
  return createModel(override, options);
}

/**
 * Alias for backwards compatibility.
 * New code should use createModelWithTools() directly.
 */
export function createGeminiToolModel(
  tools: DynamicStructuredTool[],
  override?: ModelOverride,
  options?: ResolveChatModelOptions,
) {
  return createModelWithTools(tools, override, options);
}
