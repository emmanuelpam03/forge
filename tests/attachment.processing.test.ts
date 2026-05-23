import test from "node:test";
import assert from "node:assert/strict";
import {
  getAttachmentExtension,
  inferAttachmentKind,
  sanitizeAttachmentName,
  formatAttachmentSize,
  summarizeAttachmentText,
  formatAttachmentLabel,
} from "../lib/attachment-types.ts";
import { parseImageAttachment } from "../lib/attachment-processing.ts";

test("getAttachmentExtension and inferAttachmentKind", () => {
  assert.equal(getAttachmentExtension("file.txt"), ".txt");
  assert.equal(getAttachmentExtension("noext"), "");
  assert.equal(inferAttachmentKind({ name: "image.png", mimeType: "image/png" }), "image");
  assert.equal(inferAttachmentKind({ name: "report.pdf", mimeType: "application/pdf" }), "pdf");
});

test("sanitizeAttachmentName and formatAttachmentSize", () => {
  const sanitized = sanitizeAttachmentName("  a/b\\c  .txt  ");
  assert.ok(!sanitized.includes("/") && !sanitized.includes("\\"));
  assert.ok(sanitized.endsWith('.txt'));
  assert.equal(formatAttachmentSize(512), "512 B");
  assert.ok(formatAttachmentSize(2048).includes("KB"));
});

test("summarizeAttachmentText and formatAttachmentLabel", () => {
  const long = "line1\n\nline2\nline3\nline4\nline5";
  const s = summarizeAttachmentText(long, 50);
  assert.ok(typeof s === "string" && s.length <= 50 + 1);

  const label = formatAttachmentLabel({ name: "file.txt", kind: "text" });
  assert.ok(label.includes("Text:"));
});

test("parseImageAttachment uses OCR text when available", async () => {
  const parsed = await parseImageAttachment(
    Buffer.from("not a real image", "utf8"),
    "screenshot.png",
    async () => "Hello from OCR",
  );

  assert.equal(parsed.text, "Hello from OCR");
  assert.equal(parsed.summary, "Hello from OCR");
});
