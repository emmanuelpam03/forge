import "server-only";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { assertLangSmithConfig } from "@/lib/langsmith";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export function createGeminiModel() {
  assertLangSmithConfig();

  const apiKey = process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is required for the Gemini provider.");
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    temperature: 0.4,
    maxOutputTokens: 2048,
  });
}
