import { ApiError } from "./error-response.ts";
import {
  ensureAttachmentParsed,
  type AttachmentRecordLike,
} from "./attachment-processing.ts";
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

    const failedAttachments = requestedAttachmentIds
      .map((attachmentId) => attachmentById.get(attachmentId))
      .filter(
        (attachment): attachment is NonNullable<typeof attachment> =>
          Boolean(attachment && attachment.status === "failed"),
      );

    if (failedAttachments.length > 0) {
      throw new ApiError(
        `One or more attachments previously failed extraction: ${failedAttachments
          .map((attachment) => attachment.originalName || attachment.name)
          .join(", ")}`,
        422,
      );
    }

    return attachments.filter((attachment) =>
      requestedAttachmentIds.includes(attachment.id),
    );
  }

  return attachments.filter((attachment) => attachment.status !== "failed");
}

export async function resolveAttachmentsForTurn(
  attachmentsForTurn: AttachmentRecordLike[],
  parseAttachment: (
    attachment: AttachmentRecordLike,
  ) => Promise<UploadedAttachment> = ensureAttachmentParsed,
): Promise<UploadedAttachment[]> {
  return Promise.all(
    attachmentsForTurn.map(async (attachment) => {
      try {
        return await parseAttachment(attachment);
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : "Attachment extraction failed.";
        throw new ApiError(
          `Attachment "${attachment.originalName || attachment.name}" could not be parsed: ${reason}`,
          422,
        );
      }
    }),
  );
}