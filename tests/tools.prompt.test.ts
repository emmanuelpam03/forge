import assert from "node:assert/strict";
import test from "node:test";

import { getToolsPrompt } from "../ai/prompts/promptRegistry.ts";

test("tools prompt includes imageGeneration tool", () => {
  const prompt = getToolsPrompt();
  assert.ok(/imageGeneration/.test(prompt), "tools prompt should mention imageGeneration");
  assert.ok(/imageGeneration\(prompt/.test(prompt), "tools prompt should include the imageGeneration command signature");
  assert.match(prompt, /Do NOT return raw JSON/i);
  assert.match(
    prompt,
    /<img\s+src=|&lt;img\s+src=/i,
    "tools prompt should include an HTML <img src=> example or an escaped equivalent",
  );
});

test("tools prompt includes documentGeneration guidance for file exports", () => {
  const prompt = getToolsPrompt();
  assert.match(prompt, /documentGeneration/i);
  assert.match(prompt, /PDF, DOCX, XLSX, or PPTX/i);
  assert.match(prompt, /essay, report, outline, worksheet, slide deck, spreadsheet/i);
  assert.match(prompt, /Do not return Python code, raw JSON/i);
});
