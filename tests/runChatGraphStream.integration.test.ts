import assert from "node:assert/strict";
import test from "node:test";

// Ensure model creation won't throw for tests
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";

import { ChatOpenAI } from "@langchain/openai";
import { runChatGraphStream } from "../ai/graph/index.ts";

async function* makeStream(chunks: unknown[]) {
  for (const chunk of chunks) {
    // simulate LangChain chunk shape
    yield { content: chunk };
  }
}

test("runChatGraphStream emits attachments event and persists assistantMedia when model returns fenced JSON", async () => {
  // Patch ChatOpenAI.stream before createModel constructs instances
  // The patched stream yields tokens including a fenced JSON document payload
  ChatOpenAI.prototype.stream = function () {
    return makeStream([
      "Here is a short essay about flowers. ",
      "They are beautiful and symbolic. ",
      // fenced JSON payload instructing document generation
      "```json { \"format\": \"pdf\", \"title\": \"Flowers Test\", \"body\": \"A short essay about flowers.\" } ```",
      "\nAnd that's the end of the essay.",
    ]);
  };

  const events: any[] = [];

  const state = await runChatGraphStream(
    {
      chatId: "test-chat",
      userMessage: "Write an essay about flowers and export as PDF",
      runId: "run-1",
      assistantMessageId: "assistant-1",
      forceTool: null,
      classifiedIntent: null,
      model: undefined,
      provider: undefined,
      selectedOptions: [],
      attachments: [],
      messageAttachmentIds: [],
    },
    (e) => {
      events.push(e);
    },
  );

  // Ensure an attachments event was emitted
  const attachmentsEvents = events.filter((e) => e.type === "attachments");
  assert.ok(attachmentsEvents.length > 0, "No attachments event emitted");

  // Ensure final saved state contains assistantMedia with attachments
  assert.ok((state.assistantMedia && (state.assistantMedia as any).attachments && (state.assistantMedia as any).attachments.length > 0), "assistantMedia attachments missing");

  const att = (state.assistantMedia as any).attachments[0];
  assert.ok(att.id, "attachment missing id");
  assert.ok(att.mimeType === "application/pdf", "attachment is not a PDF");
});
