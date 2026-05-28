import assert from "node:assert/strict";
import test from "node:test";

import { getToolsPrompt } from "../ai/prompts/promptRegistry.ts";

test("tools prompt includes imageGeneration tool", () => {
  const prompt = getToolsPrompt();
  assert.ok(/imageGeneration/.test(prompt), "tools prompt should mention imageGeneration");
  assert.ok(/imageGeneration\(prompt/.test(prompt), "tools prompt should include the imageGeneration command signature");
});
