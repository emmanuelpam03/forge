import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../lib/error-response.ts";
import {
  resolveAttachmentsForTurn,
  selectAttachmentsForTurn,
} from "../lib/chat-attachment-resolution.ts";
import type { AttachmentRecordLike } from "../lib/attachment-processing.ts";

function makeAttachment(overrides: Partial<AttachmentRecordLike> = {}): AttachmentRecordLike {
  return {
    id: "att-1",
    chatId: "chat-1",
    name: "report.pdf",
    originalName: "report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    storageUrl: "https://example.com/file.pdf",
    storagePath: "chat-1/att-1",
    checksum: "checksum",
    kind: "pdf",
    status: "ready",
    extractedText: "hello",
    summary: "summary",
    pageCount: 1,
    width: null,
    height: null,
    language: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("selectAttachmentsForTurn throws 400 for unknown requested attachment IDs", () => {
  const attachments = [makeAttachment({ id: "att-1" })];

  assert.throws(
    () => selectAttachmentsForTurn(attachments, ["att-1", "att-missing"]),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.match(error.message, /Unknown attachment IDs: att-missing/);
      return true;
    },
  );
});

test("selectAttachmentsForTurn throws 422 when requested attachments already failed", () => {
  const attachments = [
    makeAttachment({ id: "att-ready", status: "ready" }),
    makeAttachment({ id: "att-failed", status: "failed", originalName: "broken.pdf" }),
  ];

  assert.throws(
    () => selectAttachmentsForTurn(attachments, ["att-ready", "att-failed"]),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.match(error.message, /previously failed extraction/);
      assert.match(error.message, /broken\.pdf/);
      return true;
    },
  );
});

test("selectAttachmentsForTurn excludes failed attachments by default", () => {
  const attachments = [
    makeAttachment({ id: "att-ready", status: "ready" }),
    makeAttachment({ id: "att-failed", status: "failed" }),
  ];

  const selected = selectAttachmentsForTurn(attachments, []);
  assert.deepEqual(selected.map((attachment) => attachment.id), ["att-ready"]);
});

test("resolveAttachmentsForTurn maps parser failures to 422 ApiError", async () => {
  const attachments = [makeAttachment({ originalName: "bad.pdf" })];

  await assert.rejects(
    () =>
      resolveAttachmentsForTurn(attachments, async () => {
        throw new Error("Remote extraction timed out");
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.match(error.message, /bad\.pdf/);
      assert.match(error.message, /Remote extraction timed out/);
      return true;
    },
  );
});