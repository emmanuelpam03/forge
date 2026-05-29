import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("runChatGraphStream wiring includes attachments emission for generated files", () => {
  const indexSource = readWorkspaceFile("ai/graph/index.ts");
  const nodesSource = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(indexSource, /createForgeTools/);
  assert.match(indexSource, /type: "attachments"/);
  assert.match(nodesSource, /type: "attachments"/);
  assert.match(nodesSource, /buildAttachmentExtractionStructuredIntent/);
});
