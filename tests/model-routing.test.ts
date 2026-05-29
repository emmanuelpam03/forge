import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("generateResponseNode keeps text-model routing for image attachments", () => {
  const source = readWorkspaceFile("ai/graph/nodes.ts");

  assert.match(source, /resolveChatModelConfig\(override\)/);
  assert.doesNotMatch(source, /hasImageAttachments/);
});

test("model routing uses DeepSeek by default without a vision fallback", () => {
  const source = readWorkspaceFile("ai/models/index.ts");

  assert.match(source, /DEFAULT_MODEL\s*=\s*"deepseek\/deepseek-v4-flash"/);
  assert.match(source, /resolveChatModelConfig/);
  assert.match(source, /provider:\s*"openrouter"/);
  assert.match(source, /DEFAULT_OPENROUTER_MAX_COMPLETION_TOKENS\s*=\s*4096/);
  assert.match(source, /MAX_OPENROUTER_MAX_COMPLETION_TOKENS\s*=\s*4096/);
  assert.match(source, /Math\.min\(parsedMaxTokens, MAX_OPENROUTER_MAX_COMPLETION_TOKENS\)/);
  assert.doesNotMatch(source, /DEFAULT_VISION_MODEL|vision_model_routed|OPENROUTER_VISION_MODEL/);
  assert.doesNotMatch(source, /ollama|google-genai|llama/);
});

test("chat UI displays only DeepSeek (with expandable model picker)", () => {
  const source = readWorkspaceFile("app/c/[chatId]/ChatClient.tsx");

  // Verify only one model option exists
  assert.match(source, /const MODEL_OPTIONS: ModelOption\[\]\s*=\s*\[/);
  // Should contain DeepSeek
  assert.match(source, /deepseek\/deepseek-v4-flash/);
  assert.match(source, /DeepSeek v4 Flash/);
  // Model picker UI exists (for future expansion)
  assert.match(source, /isModelMenuOpen/);
  assert.match(source, /modelMenuRef/);
  // But only one model in options
  assert.match(source, /{ id: "deepseek\/deepseek-v4-flash", label: "DeepSeek v4 Flash"/);
  assert.doesNotMatch(source, /CODING_MODEL_OPTION/);
  // No alternate models
  assert.doesNotMatch(source, /Llama|llama|claude|Claude|GPT|gpt/);
});

test("homepage composer supports upload previews and file-drop interactions", () => {
  const source = readWorkspaceFile("app/page.tsx");

  assert.match(source, /AttachmentPreviewDialog/);
  assert.match(source, /onDragOver/);
  assert.match(source, /onPaste/);
  assert.match(source, /onPreview=/);
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
  assert.doesNotMatch(envExample, /OLLAMA_|GOOGLE_API_KEY/);
  assert.doesNotMatch(envExample, /OPENROUTER_VISION_MODEL/);
  assert.match(envExample, /OPENROUTER_MAX_COMPLETION_TOKENS=4096/);

  // Verify README reflects DeepSeek-only
  assert.match(readme, /deepseek|DeepSeek/);
});