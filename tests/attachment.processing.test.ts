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
  getCleanedAttachmentText,
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
  assert.ok(sanitized.endsWith(".txt"));
  assert.equal(formatAttachmentSize(512), "512 B");
  assert.ok(formatAttachmentSize(2048).includes("KB"));
});

test("summarizeAttachmentText and formatAttachmentLabel", () => {
  const long = "line1\n\nline2\nline3\nline4\nline5";
  const s = summarizeAttachmentText(long, 50);
  assert.ok(typeof s === "string" && s.length <= 51);

  const label = formatAttachmentLabel({ name: "file.txt", kind: "text" });
  assert.ok(label.includes("Text:"));
});

test("formatAttachmentContext lists attachment metadata only", () => {
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

  assert.match(context, /Attached Files:/);
  assert.match(context, /1\. irrelevant\.txt/);
  assert.match(context, /2\. financial-report\.pdf/);
  assert.doesNotMatch(context, /Relevant Chunks|No extracted text available/);
});

test("buildAttachmentMultimodalBlocks returns no model blocks", async () => {
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
        storageUrl: "data:image/png;base64,AAAA",
        storagePath: "path-image",
        uploadedAt: "2026-05-23T00:00:00.000Z",
      },
    ],
    "describe the diagram",
  );

  assert.deepEqual(blocks, []);
});

test("getCleanedAttachmentText returns an empty string", async () => {
  const attachment = {
    id: "pdf-1",
    chatId: "chat",
    name: "contract.pdf",
    originalName: "contract.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1234,
    checksum: "c1",
    kind: "pdf",
    status: "ready",
    storageUrl: "data:application/pdf;base64,QQ==",
    storagePath: "path-c",
    uploadedAt: "2026-05-23T00:00:00.000Z",
    extractedText: "Contract Title\nPage 1\nThis is the first page."
  } as any;

  const out = await getCleanedAttachmentText(attachment);
  assert.equal(out, "");
});