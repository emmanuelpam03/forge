import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("generateTitleNode includes conversation context when available", () => {
  const src = readWorkspaceFile("ai/graph/nodes.ts");
  // Ensure we are appending 'Context:' to the title prompt when context exists
  assert.match(src, /Context:\\n/);
  assert.match(src, /Use this context when creating a concise, descriptive title\./);
});
