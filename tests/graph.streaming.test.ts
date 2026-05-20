import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  consumeModelStream,
  extractTextFromModelChunk,
} from "../ai/graph/stream-consumer.ts";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

async function* makeStream(chunks: unknown[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

test("consumeModelStream reads LangChain AIMessageChunk content", async () => {
  let output = "";

  await consumeModelStream(
    makeStream([{ content: "Hello" }, { content: " world" }, { content: "!" }]),
    (chunkText) => {
      output += chunkText;
    },
  );

  assert.equal(output, "Hello world!");
  assert.notEqual(output.trim(), "");
});

test("extractTextFromModelChunk reads AIMessageChunk-style content", () => {
  assert.equal(extractTextFromModelChunk({ content: "DeepSeek" }), "DeepSeek");
  assert.equal(
    extractTextFromModelChunk({ content: [{ text: "tool" }, " result"] }),
    "tool result",
  );
});

test("consumeModelStream awaits a promise-wrapped stream", async () => {
  let output = "";

  await consumeModelStream(
    Promise.resolve(makeStream([{ content: "DeepSeek" }, { content: " stream" }])),
    (chunkText) => {
      output += chunkText;
    },
  );

  assert.equal(output, "DeepSeek stream");
});

test("consumeModelStream rejects non-async iterables", async () => {
  await assert.rejects(
    () => consumeModelStream({ content: "not-streaming" }, () => {}),
    /tokenStream is not async iterable/,
  );
});

test("generateResponseNode uses LangChain stream consumption", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /consumeModelStream\(/);
  assert.match(source, /extractTextFromModelChunk/);
  assert.doesNotMatch(source, /for await \(const token of tokenStream\)/);
  assert.doesNotMatch(source, /chunk\.choices\[0\]\.delta\.content/);
});
