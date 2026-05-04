import "server-only";

import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  calculatorTool,
  datetimeTool,
  projectContextLookupTool,
  summarizeTextTool,
  webSearchToolAsync,
} from "@/ai/tools/implementations";

export const calculatorToolSchema = z.object({
  expression: z.string().min(1),
});

export const webSearchToolSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(10).optional(),
});

export const datetimeToolSchema = z.object({
  action: z.enum(["now", "timezone", "date", "time"]).optional(),
});

export const summarizeTextToolSchema = z.object({
  text: z.string().min(1),
  maxSentences: z.number().int().min(1).max(24).optional(),
  format: z
    .enum([
      "sentence",
      "bullets",
      "executive",
      "technical",
      "beginner",
      "action_items",
      "paragraph",
    ])
    .optional(),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  preserveFacts: z.boolean().optional(),
});

export const projectContextLookupToolSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(12).optional(),
  includeDocuments: z.boolean().optional(),
});

export type ForgeToolContext = {
  chatId: string;
};

function formatToolOutput(result: {
  success: boolean;
  result: string;
  error?: string;
}): string {
  if (!result.success) {
    return `Tool failed: ${result.error || "Unknown tool failure"}`;
  }

  return result.result;
}

export function createForgeTools(
  context: ForgeToolContext,
): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "calculator",
      description:
        "Evaluate a math expression. Use for arithmetic, percentages, or formula-style calculations.",
      schema: calculatorToolSchema,
      func: async ({ expression }) => {
        const result = calculatorTool(expression);
        return formatToolOutput(result);
      },
    }),
    new DynamicStructuredTool({
      name: "webSearch",
      description:
        "Search the web for recent information. Uses Tavily when configured.",
      schema: webSearchToolSchema,
      func: async ({ query, maxResults }) => {
        const result = await webSearchToolAsync(query, maxResults ?? 5);
        return formatToolOutput(result);
      },
    }),
    new DynamicStructuredTool({
      name: "currentDateTime",
      description:
        "Get the current date, time, or timezone for scheduling and live queries.",
      schema: datetimeToolSchema,
      func: async ({ action }) => {
        const result = datetimeTool(action ?? "now");
        return formatToolOutput(result);
      },
    }),
    new DynamicStructuredTool({
      name: "summarizeText",
      description: "Summarize long user-provided text into concise sentences.",
      schema: summarizeTextToolSchema,
      func: async ({
        text,
        maxSentences,
        format,
        audience,
        purpose,
        preserveFacts,
      }) => {
        const result = summarizeTextTool({
          text,
          maxSentences: maxSentences ?? 3,
          format,
          audience,
          purpose,
          preserveFacts: preserveFacts ?? true,
        });
        return formatToolOutput(result);
      },
    }),
    new DynamicStructuredTool({
      name: "projectContextLookup",
      description:
        "Retrieve relevant context from current project chats and extracted documents.",
      schema: projectContextLookupToolSchema,
      func: async ({ query, maxResults, includeDocuments }) => {
        const result = await projectContextLookupTool({
          chatId: context.chatId,
          query,
          maxResults,
          includeDocuments,
        });
        return formatToolOutput(result);
      },
    }),
  ];
}
