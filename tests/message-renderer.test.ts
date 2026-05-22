import assert from "node:assert/strict";
import test from "node:test";

import { splitStreamingMarkdown } from "../components/markdown-stream.ts";

test("splitStreamingMarkdown keeps prose intact while streaming", () => {
  const result = splitStreamingMarkdown(
    "Normal paragraph with inline `code` and punctuation.",
    true,
  );

  assert.equal(
    result.markdown,
    "Normal paragraph with inline `code` and punctuation.",
  );
  assert.equal(result.trailingText, "");
});

test("splitStreamingMarkdown hides incomplete fenced code while streaming", () => {
  const result = splitStreamingMarkdown(
    "Intro text\n\n```ts\nconsole.log('hello')\n",
    true,
  );

  assert.equal(result.markdown, "Intro text\n\n");
  assert.equal(result.trailingText, "");
});

test("splitStreamingMarkdown preserves completed fenced code blocks", () => {
  const result = splitStreamingMarkdown(
    "Intro text\n\n```ts\nconsole.log('hello')\n```\nMore text.",
    true,
  );

  assert.equal(
    result.markdown,
    "Intro text\n\n```ts\nconsole.log('hello')\n```\nMore text.",
  );
  assert.equal(result.trailingText, "");
});

test("splitStreamingMarkdown returns the full message when not streaming", () => {
  const source = "```js\nconsole.log('hello')\n```";
  const result = splitStreamingMarkdown(source, false);

  assert.equal(result.markdown, source);
  assert.equal(result.trailingText, "");
});