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
  assert.match(src, /recentConversation/);
  assert.match(src, /slice\(-4\)/);
});

test("title prompt asks for semantic summary titles", () => {
  const src = readWorkspaceFile("ai/prompts/title.ts");
  assert.match(src, /Generate a concise, human-like chat title/);
  assert.match(src, /Prefer semantic topic names, not the user's exact wording\./);
  assert.match(src, /Use 3 to 6 words\./);
});
