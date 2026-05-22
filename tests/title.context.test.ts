import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("generateTitleNode includes conversation context when available", () => {
  const src = readWorkspaceFile("ai/graph/nodes.ts");
  assert.match(src, /Context:\\n/);
  // Looser check: ensure the file references conversation/context behavior
  assert.match(src, /conversation/i);
});

test("title prompt asks for semantic summary titles", () => {
  const src = readWorkspaceFile("ai/prompts/title.ts");
  // Check for core concepts rather than exact wording so small rephrases don't break tests
  assert.match(src, /concise|human[- ]?like/i);
  assert.match(src, /semantic|topic/i);
  assert.match(src, /\b3\s*(?:to|-|–|—)\s*6\b/);
});
