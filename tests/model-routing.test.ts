import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("model routing locks to OpenRouter and allowed models", () => {
  const source = readWorkspaceFile("ai/models/index.ts");

  assert.match(source, /DEFAULT_OPENROUTER_CODE_MODEL\s*=\s*\n\s*"deepseek\/deepseek-v4-flash"/);
  assert.match(source, /DEFAULT_OPENROUTER_CODING_MODEL\s*=\s*\n\s*"meta-llama\/llama-3\.3-70b-instruct:free"/);
  assert.match(source, /ALLOWED_OPENROUTER_MODELS/);
  assert.match(source, /provider:\s*"openrouter"/);
});

test("chat model picker only exposes DeepSeek and coding model", () => {
  const source = readWorkspaceFile("app/c/[chatId]/ChatClient.tsx");

  assert.match(
    source,
    /CODING_MODEL_OPTION\s*=\s*MODEL_OPTIONS\.find\(\(option\) => option\.id === "meta-llama\/llama-3\.3-70b-instruct:free"\)/,
  );
  assert.match(source, /Deepseek v4 Flash/);
  assert.match(source, /Llama 3\.3 70B Instruct Free/);
  assert.doesNotMatch(source, /GPT-OSS 120B/);
  assert.doesNotMatch(source, /Gemma 4 31B IT/);
});