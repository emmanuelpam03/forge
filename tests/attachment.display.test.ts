import assert from "node:assert/strict";
import test from "node:test";
import {
  assignAttachmentsToUserMessages,
  parseSerializedAttachment,
} from "../lib/attachment-display.ts";

test("parseSerializedAttachment accepts API fallback URLs without storagePath", () => {
  const parsed = parseSerializedAttachment(
    {
      id: "att-1",
      name: "Bus Pass.pdf",
      originalName: "Bus Pass.pdf",
      mimeType: "application/pdf",
    },
    "chat-1",
  );

  assert.ok(parsed);
  assert.equal(parsed?.storageUrl, "/api/attachments/chat-1/att-1");
  assert.equal(parsed?.storagePath, "att-1");
});

test("assignAttachmentsToUserMessages links uploads to the next user message", () => {
  const uploadTime = new Date("2026-05-24T10:00:00.000Z");
  const messageTime = new Date("2026-05-24T10:00:05.000Z");

  const assignments = assignAttachmentsToUserMessages(
    [{ id: "msg-1", createdAt: messageTime }],
    [
      {
        id: "att-1",
        chatId: "chat-1",
        name: "Bus Pass.pdf",
        originalName: "Bus Pass.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        storageUrl: "https://example.com/bus.pdf",
        storagePath: "bus",
        checksum: "",
        kind: "pdf",
        status: "ready",
        createdAt: uploadTime,
      },
    ],
  );

  assert.equal(assignments.get("msg-1")?.length, 1);
  assert.equal(assignments.get("msg-1")?.[0]?.name, "Bus Pass.pdf");
});
