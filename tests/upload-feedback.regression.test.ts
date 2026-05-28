import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("upload handlers keep upload feedback but omit extraction-specific copy", () => {
  const homeSource = readWorkspaceFile("app/page.tsx");
  const chatSource = readWorkspaceFile("app/c/[chatId]/ChatClient.tsx");
  const uploadRouteSource = readWorkspaceFile("app/api/upload/route.ts");
  const attachmentProcessingSource = readWorkspaceFile("lib/attachment-processing.ts");

  assert.match(homeSource, /uploadedAttachment\.status === "failed"/);
  assert.match(chatSource, /uploadedAttachment\.status === "failed"/);
  assert.match(homeSource, /Upload completed/);
  assert.match(chatSource, /Upload completed/);
  assert.doesNotMatch(homeSource, /extraction failed/);
  assert.doesNotMatch(chatSource, /extraction failed/);
  assert.match(homeSource, /type: "info"[\s\S]*Upload queued/);
  assert.match(chatSource, /type: "info"[\s\S]*Upload queued/);
  assert.match(homeSource, /Remove failed attachments/);
  assert.match(chatSource, /Remove failed attachments/);
  assert.match(uploadRouteSource, /const message =/);
  assert.match(uploadRouteSource, /error instanceof Error/);
  assert.match(uploadRouteSource, /NextResponse\.json\(\{ error: message \}/);
  assert.doesNotMatch(attachmentProcessingSource, /extraction failed/);
  assert.doesNotMatch(attachmentProcessingSource, /shouldDeferParsing/);
});