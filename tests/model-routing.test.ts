import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("model routing is DeepSeek-only via OpenRouter", () => {
  const source = readWorkspaceFile("ai/models/index.ts");

  // Verify DeepSeek is the only default model
  assert.match(source, /DEFAULT_MODEL\s*=\s*"deepseek\/deepseek-v4-flash"/);
  // Verify provider is always openrouter
  assert.match(source, /provider:\s*"openrouter"/);
  // Verify no alternate model support
  assert.doesNotMatch(source, /ollama|google-genai|gemini|llama|claude|gpt/);
});

test("chat UI displays only DeepSeek (no model picker)", () => {
  const source = readWorkspaceFile("app/c/[chatId]/ChatClient.tsx");

  // Verify only one model option exists
  assert.match(source, /const MODEL_OPTIONS: ModelOption\[\]\s*=\s*\[/);
  // Should contain DeepSeek
  assert.match(source, /deepseek\/deepseek-v4-flash/);
  assert.match(source, /DeepSeek v4 Flash/);
  // Verify model picker dropdown is removed
  assert.doesNotMatch(source, /isModelMenuOpen/);
  assert.doesNotMatch(source, /modelMenuRef/);
  assert.doesNotMatch(source, /CODING_MODEL_OPTION/);
  // No alternate models
  assert.doesNotMatch(source, /Llama|llama|claude|Claude|GPT|gpt/);
});

test("API routes only accept openrouter provider", () => {
  const chatRoute = readWorkspaceFile("app/api/chat/route.ts");
  const editRoute = readWorkspaceFile("app/api/chat/edit/route.ts");
  const regenRoute = readWorkspaceFile("app/api/chat/regenerate/route.ts");

  // Verify provider enum is restricted to openrouter only
  assert.match(chatRoute, /provider:\s*z\.enum\(\["openrouter"\]\)/);
  assert.match(editRoute, /provider:\s*z\.enum\(\["openrouter"\]\)/);
  assert.match(regenRoute, /provider:\s*z\.enum\(\["openrouter"\]\)/);

  // Verify no support for other providers
  assert.doesNotMatch(chatRoute, /google-genai|ollama/);
  assert.doesNotMatch(editRoute, /google-genai|ollama/);
  assert.doesNotMatch(regenRoute, /google-genai|ollama/);
});

test("environment config is DeepSeek-only", () => {
  const envExample = readWorkspaceFile(".env.example");
  const readme = readWorkspaceFile("README.md");

  // Verify env example only mentions OpenRouter
  assert.match(envExample, /OPENROUTER_API_KEY/);
  assert.match(envExample, /DeepSeek/);
  assert.doesNotMatch(envExample, /OLLAMA_|GEMINI_|GOOGLE_API_KEY/);

  // Verify README reflects DeepSeek-only
  assert.match(readme, /deepseek|DeepSeek/);
});