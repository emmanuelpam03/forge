import { ApiError } from "./error-response.ts";
import { normalizeAttachmentRecord, type AttachmentRecordLike } from "./attachment-processing.ts";
import type { UploadedAttachment } from "./attachment-types.ts";

export function selectAttachmentsForTurn(
  attachments: AttachmentRecordLike[],
  requestedAttachmentIds: string[],
): AttachmentRecordLike[] {
  if (requestedAttachmentIds.length > 0) {
    const attachmentById = new Map(
      attachments.map((attachment) => [attachment.id, attachment]),
    );

    const missingAttachmentIds = requestedAttachmentIds.filter(
      (attachmentId) => !attachmentById.has(attachmentId),
    );
    if (missingAttachmentIds.length > 0) {
      throw new ApiError(
        `Unknown attachment IDs: ${missingAttachmentIds.join(", ")}`,
        400,
      );
    }

    return attachments.filter((attachment) =>
      requestedAttachmentIds.includes(attachment.id),
    );
  }

  return attachments;
}

export async function resolveAttachmentsForTurn(
  attachmentsForTurn: AttachmentRecordLike[],
): Promise<UploadedAttachment[]> {
  void attachmentsForTurn;
  return attachmentsForTurn.map((attachment) => normalizeAttachmentRecord(attachment));
}