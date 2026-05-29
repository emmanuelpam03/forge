import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("plural image requests route to imageGeneration and default to three images", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /const imageGenerationRequested = imageGenerationPattern\.test\(message\) \|\| explicitImageRequestPattern\.test\(message\);/);
  assert.match(source, /if \(!hasAnyAttachment && imageGenerationRequested\) \{\n\s+selectedTools\.push\("imageGeneration"\);\n\s+\}/);
  assert.match(source, /if \(!hasAnyAttachment && !hasImageAttachment && !imageGenerationRequested && visualContextPattern\.test\(message\)\)/);
  assert.match(source, /return 3;/);
});

test("explicit image counts are preserved for imageGeneration", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /count: extractRequestedImageCount\(message\),/);
  assert.match(source, /\bone: 1,\s*two: 2,\s*three: 3,/s);
  assert.match(source, /if \(/);
});

test("singular image requests default to one generated image", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.ok(source.includes('if (/\\ban image\\b|\\bone image\\b|\\b1 image\\b/i.test(input))'));
  assert.ok(source.includes('return 1;'));
});
