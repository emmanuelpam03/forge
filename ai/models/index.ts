import "server-only";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { assertLangSmithConfig } from "@/lib/langsmith";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

// Native client for true streaming
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

  // Attach native streaming method to model
  const modelWithNativeStream = model as unknown as Record<string, unknown>;
  modelWithNativeStream.nativeStream = async function (
    messages: BaseMessage[],
  ) {
    const nativeModel = getNativeClient().getGenerativeModel({
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
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

    // Use native streaming with generateContentStream
    const stream = nativeModel.generateContentStream({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.6,
      },
    });

    return stream;
  };

  return model;
}

export function createGeminiToolModel(tools: DynamicStructuredTool[]) {
  return createGeminiModel().bindTools(tools);
}
