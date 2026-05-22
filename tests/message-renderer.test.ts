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

test("streaming: incomplete final line without trailing newline", () => {
  const source = "Complete line\nIncomplete";
  const result = splitStreamingMarkdown(source, true);

  assert.equal(result.markdown, "Complete line\n");
  assert.equal(result.trailingText, "Incomplete");
});

test("streaming: fence-length mismatch (open with 4 backticks, close with 3)", () => {
  const source = "Text\n\n````js\ncode\n```\nmore";
  const result = splitStreamingMarkdown(source, true);

  // The 4-backtick fence is not closed by a 3-backtick fence, so the fence
  // remains open and markdown should stop before the fence.
  assert.equal(result.markdown, "Text\n\n");
  assert.equal(result.trailingText, "");
});

test("streaming: tilde fences treated like backticks (unclosed)", () => {
  const source = "Text\n\n~~~python\nprint('hello')\n";
  const result = splitStreamingMarkdown(source, true);

  // Unclosed tilde fence should be treated as an open fence
  assert.equal(result.markdown, "Text\n\n");
  assert.equal(result.trailingText, "");
});

test("streaming: multiple consecutive fences (first closed, second open)", () => {
  const source = "Intro\n\n```js\ncode\n```\n\n```py\npartial";
  const result = splitStreamingMarkdown(source, true);

  // The first fenced block is complete and should be included; the second is
  // started but not closed so markdown stops before the second fence.
  assert.equal(result.markdown, "Intro\n\n```js\ncode\n```\n\n");
  assert.equal(result.trailingText, "");
});

test("streaming: mixed fence types do not close each other", () => {
  const source = "Text\n\n```js\ncode\n~~~\n";
  const result = splitStreamingMarkdown(source, true);

  // A tilde fence should not close a backtick fence; since backticks are
  // unclosed, markdown stops before the fence.
  assert.equal(result.markdown, "Text\n\n");
  assert.equal(result.trailingText, "");
});