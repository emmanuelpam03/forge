import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("graph nodes do not expose raw tool-context fallback", () => {
  const src = readWorkspaceFile("ai/graph/nodes.ts");

  // Ensure no direct raw-tool fallback string remains
  assert.equal(
    src.includes("Based on the information I found:"),
    false,
    "Found raw tool fallback phrase in ai/graph/nodes.ts",
  );

  // Ensure no direct `state.toolContext ||` fallback remains in critical draft paths
  assert.equal(
    src.includes("state.toolContext ||"),
    false,
    "Found a `state.toolContext ||` fallback in ai/graph/nodes.ts",
  );
});
