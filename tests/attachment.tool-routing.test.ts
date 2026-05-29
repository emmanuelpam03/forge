import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("tool planner does not infer imageSearch when any attachment exists", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /const hasAnyAttachment = hasAnyActiveAttachment\(state\)/);
  assert.match(
    source,
    /const imageGenerationRequested = imageGenerationPattern\.test\(message\) \|\| explicitImageRequestPattern\.test\(message\);/,
  );
  assert.match(
    source,
    /if \(!hasAnyAttachment && !hasImageAttachment && !imageGenerationRequested && visualContextPattern\.test\(message\)\)/,
  );
});

test("intent classifier applies attachment extraction heuristic", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /shouldPreferAttachmentExtractionIntent\(state\)/);
  assert.match(source, /buildAttachmentExtractionStructuredIntent\(\)/);
  assert.match(source, /intent: "factual"/);
});

