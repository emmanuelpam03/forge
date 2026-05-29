import assert from "node:assert/strict";
import test from "node:test";

import { consumeModelStream } from "../ai/graph/stream-consumer.ts";

async function* makeStream(chunks: unknown[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

test("consumeModelStream intercepts fenced JSON and invokes handler", async () => {
  let visible = "";
  let seenJson: string | null = null;

  const chunks = [
    { content: "Here is the essay intro. " },
    { content: "```json { \"format\":\"pdf\", \"title\":\"Flowers\" } ```" },
    { content: " And here is the closing line." },
  ];

  await consumeModelStream(
    makeStream(chunks),
    (chunkText) => {
      visible += chunkText;
    },
    (jsonText) => {
      seenJson = jsonText;
    },
  );

  // Visible text should not contain the raw JSON payload
  assert.ok(visible.includes("Here is the essay intro."));
  assert.ok(visible.includes("closing line"));
  assert.ok(!visible.includes('"format"') && !visible.includes("{ \"format\""));

  // Handler should have received the JSON body
  assert.ok(seenJson, "onFencedJson handler was not called");
  const parsed = JSON.parse(seenJson as string);
  assert.equal(parsed.format, "pdf");
  assert.equal(parsed.title, "Flowers");
});

test("consumeModelStream parses nested fenced JSON across chunks", async () => {
  let visible = "";
  let seenJson: string | null = null;

  const chunks = [
    { content: "Lead text before the block. ```json { \"format\": \"pdf\", \"meta\": { \"nested\": { \"level\": 2 } }, " },
    { content: "\"title\": \"Nested\" } ``` Tail text after the block." },
  ];

  await consumeModelStream(
    makeStream(chunks),
    (chunkText) => {
      visible += chunkText;
    },
    (jsonText) => {
      seenJson = jsonText;
    },
  );

  assert.ok(visible.includes("Lead text before the block."));
  assert.ok(visible.includes("Tail text after the block."));
  assert.ok(seenJson, "onFencedJson handler was not called for nested JSON");

  const parsed = JSON.parse(seenJson as string);
  assert.equal(parsed.format, "pdf");
  assert.equal(parsed.meta.nested.level, 2);
  assert.equal(parsed.title, "Nested");
});

test("consumeModelStream does not flush a pending large fenced JSON block", async () => {
  let visible = "";
  let seenJson: string | null = null;

  const largePrefix = "x".repeat(700);
  const largeSuffix = "y".repeat(700);

  const chunks = [
    { content: "Intro text before the block. ```json { \"format\": \"pdf\", \"data\": \"" + largePrefix },
    { content: largeSuffix + "\" } ``` Outro text after the block." },
  ];

  await consumeModelStream(
    makeStream(chunks),
    (chunkText) => {
      visible += chunkText;
    },
    (jsonText) => {
      seenJson = jsonText;
    },
  );

  assert.ok(visible.includes("Intro text before the block."));
  assert.ok(visible.includes("Outro text after the block."));
  assert.ok(!visible.includes('"format"'));
  assert.ok(!visible.includes('"data"'));
  assert.ok(seenJson, "onFencedJson handler was not called for the large block");

  const parsed = JSON.parse(seenJson as string);
  assert.equal(parsed.format, "pdf");
  assert.equal(parsed.data.length, largePrefix.length + largeSuffix.length);
});
