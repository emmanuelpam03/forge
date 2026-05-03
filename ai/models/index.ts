import "server-only";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { assertLangSmithConfig } from "@/lib/langsmith";

// Small internal helper to split text into readable chunks for streaming
function chunkTextForStreaming(text: string): string[] {
  if (!text) return [];
  const wordChunks = text.match(/\S+\s*/g) ?? [text];
  const chunks: string[] = [];

  for (const chunk of wordChunks) {
    if (chunk.length <= 80) {
      chunks.push(chunk);
      continue;
    }

    for (let i = 0; i < chunk.length; i += 80) {
      chunks.push(chunk.slice(i, i + 80));
    }
  }

  return chunks;
}

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export function createGeminiModel() {
  assertLangSmithConfig();

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is required for the Gemini provider.");
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    temperature: 0.6,
    maxRetries: 2,
  });

  // Preserve the provider-native stream implementation before overriding.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeModelStream = (model as any).stream;

  // Attach a `stream` async iterator to the model instance.
  // If the underlying model implementation already exposes a `stream` method, prefer it.
  // Otherwise, fall back to invoking and chunking the final text.
  // The stream yields string chunks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (model as any).stream = async function* (messages: any[]) {
    // Native streaming support
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nativeStream =
        (typeof nativeModelStream === "function"
          ? nativeModelStream
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (model as any).streamFromProvider) ?? null;
      if (
        typeof nativeStream === "function" &&
        nativeStream !== (model as any).stream
      ) {
        for await (const part of nativeStream.call(model, messages)) {
          if (!part) continue;
          if (typeof part === "string") {
            yield part;
            continue;
          }
          if (typeof part === "object") {
            const text = (
              part.text ??
              part.content ??
              part.delta ??
              ""
            ).toString();
            if (text) yield text;
          }
        }
        return;
      }
    } catch (err) {
      // If native streaming fails, fall back to invoke below.
      // We'll continue to fallback behavior.
      // eslint-disable-next-line no-console
      console.warn(
        "Native model.stream attempt failed, falling back to invoke:",
        err,
      );
    }

    // Fallback: invoke and chunk the final content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).invoke(messages as any[]);
    // Attempt to extract text from common shapes
    let text = "";
    if (!result) text = "";
    else if (typeof result === "string") text = result;
    else if (Array.isArray(result?.content)) {
      text = result.content
        .map((p: any) => p?.text ?? p?.content ?? "")
        .join("");
    } else if (typeof result?.content === "string") {
      text = result.content;
    } else if (result?.content && typeof result.content === "object") {
      text = (result.content.text ?? result.content.content ?? "").toString();
    }

    const chunks = chunkTextForStreaming(String(text ?? ""));
    for (const c of chunks) {
      yield c;
    }
  };

  return model;
}

export function createGeminiToolModel(tools: DynamicStructuredTool[]) {
  return createGeminiModel().bindTools(tools);
}
