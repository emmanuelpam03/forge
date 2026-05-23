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
import {
  buildAttachmentMultimodalBlocks,
  formatAttachmentContext,
  parseImageAttachment,
} from "../lib/attachment-processing.ts";

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

test("formatAttachmentContext ranks relevant attachments first", () => {
  const context = formatAttachmentContext(
    [
      {
        id: "1",
        chatId: "chat",
        name: "irrelevant.txt",
        originalName: "irrelevant.txt",
        mimeType: "text/plain",
        sizeBytes: 10,
        checksum: "a",
        kind: "text",
        status: "ready",
        storageUrl: "data:text/plain;base64,QQ==",
        storagePath: "path-a",
        uploadedAt: "2026-05-23T00:00:00.000Z",
        summary: "misc notes",
      },
      {
        id: "2",
        chatId: "chat",
        name: "financial-report.pdf",
        originalName: "financial-report.pdf",
        mimeType: "application/pdf",
        sizeBytes: 20,
        checksum: "b",
        kind: "pdf",
        status: "ready",
        storageUrl: "data:application/pdf;base64,QQ==",
        storagePath: "path-b",
        uploadedAt: "2026-05-23T00:01:00.000Z",
        summary: "quarterly revenue forecast",
        extractedText: "Revenue forecast and quarterly earnings",
      },
    ],
    "quarterly revenue",
  );

  assert.match(context, /1\. financial-report\.pdf/);
});

test("buildAttachmentMultimodalBlocks emits image_url blocks for images", async () => {
  const dataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4JYlQAAAAASUVORK5CYII=";

  const blocks = await buildAttachmentMultimodalBlocks(
    [
      {
        id: "img-1",
        chatId: "chat",
        name: "diagram.png",
        originalName: "diagram.png",
        mimeType: "image/png",
        sizeBytes: 123,
        checksum: "image-checksum",
        kind: "image",
        status: "ready",
        storageUrl: dataUrl,
        storagePath: "path-image",
        uploadedAt: "2026-05-23T00:00:00.000Z",
      },
    ],
    "describe the diagram",
  );

  assert.equal(blocks[0].type, "text");
  assert.equal(blocks[1].type, "image_url");
  if (blocks[1].type === "image_url") {
    assert.equal(blocks[1].image_url.url, dataUrl);
  }
});
