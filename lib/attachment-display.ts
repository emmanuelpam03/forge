import {
  inferAttachmentKind,
  type AttachmentKind,
  type UploadedAttachment,
} from "./attachment-types.ts";

export type AttachmentRecordInput = {
  id: string;
  chatId: string;
  name: string;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageUrl?: string | null;
  storagePath?: string | null;
  checksum?: string | null;
  kind?: string | null;
  status?: string | null;
  extractedText?: string | null;
  summary?: string | null;
  pageCount?: number | null;
  width?: number | null;
  height?: number | null;
  language?: string | null;
  createdAt: Date;
};

const VALID_ATTACHMENT_KINDS = new Set<AttachmentKind>([
  "image",
  "pdf",
  "document",
  "code",
  "spreadsheet",
  "text",
  "json",
  "audio",
  "video",
  "other",
]);

function isValidAttachmentKind(value: unknown): value is AttachmentKind {
  return typeof value === "string" && VALID_ATTACHMENT_KINDS.has(value as AttachmentKind);
}

export function mapRecordToUploadedAttachment(
  attachment: AttachmentRecordInput,
): UploadedAttachment {
  const name = attachment.name;
  const originalName = attachment.originalName ?? attachment.name;
  const mimeType = attachment.mimeType ?? "application/octet-stream";
  const storageUrl =
    attachment.storageUrl?.trim() ||
    `/api/attachments/${attachment.chatId}/${attachment.id}`;
  const storagePath = attachment.storagePath?.trim() || attachment.id;

  return {
    id: attachment.id,
    chatId: attachment.chatId,
    name,
    originalName,
    mimeType,
    sizeBytes: attachment.sizeBytes ?? 0,
    checksum: attachment.checksum ?? "",
    kind: isValidAttachmentKind(attachment.kind)
      ? attachment.kind
      : inferAttachmentKind({ name, mimeType }),
    status:
      attachment.status === "uploading" ||
      attachment.status === "processing" ||
      attachment.status === "ready" ||
      attachment.status === "failed"
        ? attachment.status
        : "ready",
    storageUrl,
    storagePath,
    uploadedAt: attachment.createdAt.toISOString(),
    extractedText: attachment.extractedText ?? undefined,
    summary: attachment.summary ?? undefined,
    pageCount: attachment.pageCount ?? undefined,
    width: attachment.width ?? undefined,
    height: attachment.height ?? undefined,
    language: attachment.language ?? undefined,
  };
}

export function parseSerializedAttachment(
  input: unknown,
  chatId: string,
): UploadedAttachment | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const attachment = input as Record<string, unknown>;
  const name = typeof attachment.name === "string" ? attachment.name : undefined;
  const originalName =
    typeof attachment.originalName === "string"
      ? attachment.originalName
      : name;
  const mimeType =
    typeof attachment.mimeType === "string"
      ? attachment.mimeType
      : "application/octet-stream";
  const id =
    typeof attachment.id === "string" && attachment.id
      ? attachment.id
      : undefined;
  const resolvedChatId =
    typeof attachment.chatId === "string" ? attachment.chatId : chatId;

  if (!name || !originalName) {
    return null;
  }

  const storageUrl =
    typeof attachment.storageUrl === "string" && attachment.storageUrl
      ? attachment.storageUrl
      : id
        ? `/api/attachments/${resolvedChatId}/${id}`
        : "";
  const storagePath =
    typeof attachment.storagePath === "string" && attachment.storagePath
      ? attachment.storagePath
      : id ?? "";

  if (!storageUrl) {
    return null;
  }

  return {
    id: id ?? storagePath,
    chatId: resolvedChatId,
    name,
    originalName,
    mimeType,
    sizeBytes:
      typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : 0,
    checksum:
      typeof attachment.checksum === "string" ? attachment.checksum : "",
    kind: isValidAttachmentKind(attachment.kind)
      ? attachment.kind
      : inferAttachmentKind({ name, mimeType }),
    status:
      attachment.status === "uploading" ||
      attachment.status === "processing" ||
      attachment.status === "ready" ||
      attachment.status === "failed"
        ? attachment.status
        : "ready",
    storageUrl,
    storagePath,
    uploadedAt:
      typeof attachment.uploadedAt === "string"
        ? attachment.uploadedAt
        : new Date().toISOString(),
    extractedText:
      typeof attachment.extractedText === "string"
        ? attachment.extractedText
        : undefined,
    summary:
      typeof attachment.summary === "string" ? attachment.summary : undefined,
    pageCount:
      typeof attachment.pageCount === "number"
        ? attachment.pageCount
        : undefined,
    width:
      typeof attachment.width === "number" ? attachment.width : undefined,
    height:
      typeof attachment.height === "number" ? attachment.height : undefined,
    language:
      typeof attachment.language === "string"
        ? attachment.language
        : undefined,
    error:
      typeof attachment.error === "string" ? attachment.error : undefined,
  };
}

export function extractAttachmentBlockFromMedia(
  media: unknown,
  chatId: string,
): { attachments: UploadedAttachment[] } | undefined {
  if (!media || typeof media !== "object") {
    return undefined;
  }

  const maybeMedia = media as Record<string, unknown>;
  const rawAttachments = Array.isArray(maybeMedia.attachments)
    ? maybeMedia.attachments
    : [];
  const attachments = rawAttachments
    .map((attachment) => parseSerializedAttachment(attachment, chatId))
    .filter((attachment): attachment is UploadedAttachment => attachment !== null);

  if (attachments.length === 0) {
    return undefined;
  }

  return { attachments };
}

/**
 * Assign chat-level uploads to user messages by upload/send timing.
 * Used when message.media was not persisted yet.
 */
export function assignAttachmentsToUserMessages(
  userMessages: Array<{ id: string; createdAt: Date }>,
  attachments: AttachmentRecordInput[],
): Map<string, UploadedAttachment[]> {
  const sortedUsers = [...userMessages].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const sortedAttachments = [...attachments].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const assignments = new Map<string, UploadedAttachment[]>();

  for (const userMessage of sortedUsers) {
    assignments.set(userMessage.id, []);
  }

  if (sortedUsers.length === 0) {
    return assignments;
  }

  for (const attachment of sortedAttachments) {
    const uploadedAt = attachment.createdAt.getTime();
    const target =
      sortedUsers.find(
        (userMessage) => userMessage.createdAt.getTime() >= uploadedAt,
      ) ?? sortedUsers[sortedUsers.length - 1];

    const normalized = mapRecordToUploadedAttachment(attachment);
    assignments.get(target.id)?.push(normalized);
  }

  return assignments;
}
