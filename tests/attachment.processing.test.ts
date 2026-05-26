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
  parseAttachmentBuffer,
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

test("parseAttachmentBuffer handles csv locally", async () => {
  const parsed = await parseAttachmentBuffer({
    chatId: "chat",
    fileName: "report.csv",
    mimeType: "text/csv",
    sizeBytes: 40,
    buffer: Buffer.from("name,score\nalpha,10\nbeta,20", "utf8"),
  });

  assert.match(parsed.text ?? "", /alpha, 10/);
  assert.ok((parsed.summary ?? "").length > 0);
});

test("parseAttachmentBuffer handles json/text locally", async () => {
  const parsed = await parseAttachmentBuffer({
    chatId: "chat",
    fileName: "payload.json",
    mimeType: "application/json",
    sizeBytes: 32,
    buffer: Buffer.from('{"ok":true,"count":2}', "utf8"),
  });

  assert.match(parsed.text ?? "", /"ok": true/);
  assert.ok((parsed.summary ?? "").length > 0);
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

test("buildAttachmentMultimodalBlocks uses remote https URLs without re-encoding", async () => {
  const remoteUrl = "https://res.cloudinary.com/demo/image/upload/sample.png";

  const blocks = await buildAttachmentMultimodalBlocks(
    [
      {
        id: "img-remote",
        chatId: "chat",
        name: "sample.png",
        originalName: "sample.png",
        mimeType: "image/png",
        sizeBytes: 123,
        checksum: "remote-checksum",
        kind: "image",
        status: "ready",
        storageUrl: remoteUrl,
        storagePath: "path-remote",
        uploadedAt: "2026-05-23T00:00:00.000Z",
      },
    ],
    "describe this image",
  );

  assert.equal(blocks[1].type, "image_url");
  if (blocks[1].type === "image_url") {
    assert.equal(blocks[1].image_url.url, remoteUrl);
  }
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

test("getCleanedAttachmentText returns structured pages and summary", async () => {
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
    extractedText: "Contract Title\nPage 1\nThis is the first page.\nPage 2\nThis is the second page.",
  } as any;

  const { getCleanedAttachmentText } = await import("../lib/attachment-processing.ts");
  const out = await getCleanedAttachmentText(attachment);
  console.log("=== CLEANED OUTPUT START ===\n" + out + "\n=== CLEANED OUTPUT END ===");
  assert.ok(typeof out === "string");
  assert.ok(out.includes("Page 1:"));
  assert.ok(out.includes("Page 2:"));
  assert.ok(out.includes("Summary:"));
});
