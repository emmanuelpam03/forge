import "server-only";

import { createHash } from "node:crypto";
import {
  ATTACHMENT_MAX_BYTES,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ALLOWED_ATTACHMENT_MIME_PREFIXES,
  inferAttachmentKind,
  sanitizeAttachmentName,
  getAttachmentExtension,
  type UploadedAttachment,
} from "./attachment-types.ts";
import { uploadAttachmentToCloudinary } from "./cloudinary.ts";

export type AttachmentInput = {
  chatId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type AttachmentRecordLike = {
  id: string;
  chatId: string;
  name: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storageUrl: string | null;
  storagePath: string | null;
  checksum: string | null;
  kind: string | null;
  status: string | null;
  extractedText: string | null;
  summary: string | null;
  pageCount: number | null;
  width: number | null;
  height: number | null;
  language: string | null;
  createdAt: Date;
};

export function validateAttachmentCandidate(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): string | null {
  if (input.sizeBytes <= 0) {
    return "File is empty.";
  }

  if (input.sizeBytes > ATTACHMENT_MAX_BYTES) {
    return "File exceeds the 50 MB upload limit.";
  }

  const extension = getAttachmentExtension(input.fileName);
  const normalizedMimeType = input.mimeType.toLowerCase();
  const mimeAllowed = ALLOWED_ATTACHMENT_MIME_PREFIXES.some((prefix) =>
    normalizedMimeType.startsWith(prefix),
  );

  if (extension === ".svg" || normalizedMimeType.includes("svg+xml")) {
    return "SVG images are not supported yet.";
  }

  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) && !mimeAllowed) {
    return "This file type is not supported yet.";
  }

  return null;
}

export async function persistAttachmentFile(
  input: AttachmentInput,
  attachmentId: string,
): Promise<{ storagePath: string; storageUrl: string; checksum: string }> {
  const safeName = sanitizeAttachmentName(input.fileName);
  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const uploadResult = await uploadAttachmentToCloudinary({
    chatId: input.chatId,
    attachmentId,
    buffer: input.buffer,
    fileName: safeName,
    mimeType: input.mimeType,
  });

  return {
    storagePath: uploadResult.public_id,
    storageUrl: uploadResult.secure_url,
    checksum,
  };
}

export function normalizeAttachmentRecord(
  attachment: AttachmentRecordLike,
): UploadedAttachment {
  const name = attachment.name;
  const mimeType = attachment.mimeType ?? "application/octet-stream";

  return {
    id: attachment.id,
    chatId: attachment.chatId,
    name,
    originalName: attachment.originalName,
    mimeType,
    sizeBytes: attachment.sizeBytes ?? 0,
    checksum: attachment.checksum ?? "",
    kind:
      attachment.kind && attachment.kind !== ""
        ? (attachment.kind as UploadedAttachment["kind"])
        : inferAttachmentKind({ name, mimeType }),
    status:
      attachment.status === "uploading" ||
      attachment.status === "processing" ||
      attachment.status === "ready" ||
      attachment.status === "failed"
        ? attachment.status
        : "ready",
    storageUrl: attachment.storageUrl ?? "",
    storagePath: attachment.storagePath ?? "",
    uploadedAt:
      attachment.createdAt instanceof Date
        ? attachment.createdAt.toISOString()
        : new Date().toISOString(),
    extractedText: attachment.extractedText ?? undefined,
    summary: attachment.summary ?? undefined,
    pageCount: attachment.pageCount ?? undefined,
    width: attachment.width ?? undefined,
    height: attachment.height ?? undefined,
    language: attachment.language ?? undefined,
  };
}

export async function ensureAttachmentParsed(
  attachment: AttachmentRecordLike,
): Promise<UploadedAttachment> {
  void attachment;
  return normalizeAttachmentRecord({
    ...attachment,
    status: attachment.status === "failed" ? "failed" : "ready",
  });
}

export async function buildUploadedAttachment(input: AttachmentInput & { attachmentId: string }): Promise<UploadedAttachment> {
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const { storagePath, storageUrl, checksum } = await persistAttachmentFile(input, input.attachmentId);
  const prisma = (await import("./prisma.ts")).default;
  const status: "processing" | "ready" = "ready";

  // Persist metadata to the database (best-effort) using the typed Prisma client.
  try {
    await prisma.attachment.create({
      data: {
        id: input.attachmentId,
        chatId: input.chatId,
        name: sanitizeAttachmentName(input.fileName),
        originalName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageUrl,
        storagePath,
        checksum,
        kind,
        status,
        extractedText: null,
        summary: null,
        pageCount: null,
        width: null,
        height: null,
        language: null,
      },
    });
  } catch (err) {
    // Don't fail the upload if DB persistence fails; log and continue.
    try {
      console.error("Failed to persist attachment metadata:", err);
    } catch {}
  }

  return {
    id: input.attachmentId,
    chatId: input.chatId,
    name: sanitizeAttachmentName(input.fileName),
    originalName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksum,
    kind,
    status,
    storageUrl,
    storagePath,
    uploadedAt: new Date().toISOString(),
    extractedText: undefined,
    summary: undefined,
    pageCount: undefined,
    width: undefined,
    height: undefined,
    language: undefined,
  };
}

function normalizeAttachmentText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

// Keep a normalization helper for legacy callers, but do not infer content.
export function cleanExtractedText(input: string): string {
  return normalizeAttachmentText(input);
}

export function structureTextByPage(cleaned: string, approxCharsPerPage = 2000): { title?: string; pages: string[]; summary: string } {
  void approxCharsPerPage;
  const normalized = normalizeAttachmentText(cleaned);
  return {
    title: undefined,
    pages: normalized ? [normalized] : [],
    summary: "",
  };
}

export async function getCleanedAttachmentText(attachment: UploadedAttachment): Promise<string> {
  void attachment;
  return "";
}

export function formatAttachmentContext(
  attachments: UploadedAttachment[] | undefined,
  query: string,
): string {
  void query;
  if (!attachments || attachments.length === 0) {
    return "";
  }

  const sections = attachments.map((attachment, index) => [
    `${index + 1}. ${attachment.name}`,
    `   - Type: ${attachment.kind.toUpperCase()}`,
    `   - Status: ${attachment.status}`,
    attachment.summary ? `   - Summary: ${attachment.summary}` : null,
    attachment.pageCount ? `   - Pages: ${attachment.pageCount}` : null,
    attachment.width && attachment.height ? `   - Dimensions: ${attachment.width}x${attachment.height}` : null,
  ]
    .filter(Boolean)
    .join("\n"));

  return [`Attached Files:`, ...sections].join("\n\n");
}

export type AttachmentMessageContentBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
        detail?: "auto" | "low" | "high";
      };
    };

export async function buildAttachmentMultimodalBlocks(
  attachments: UploadedAttachment[] | undefined,
  query: string,
): Promise<AttachmentMessageContentBlock[]> {
  void attachments;
  void query;
  return [];
}

// Export a helper to build standardized messages for previously failed
// extraction cases so callers can avoid embedding the literal message.
export function buildPreviouslyFailedExtractionMessage(attachment: { originalName?: string | null; name?: string | null; id: string }): string {
  const display = attachment.originalName || attachment.name || attachment.id;
  return `One or more attachments previously failed extraction: ${display}`;
}
