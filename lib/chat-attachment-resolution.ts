import { ApiError } from "./error-response.ts";
import { normalizeAttachmentRecord, type AttachmentRecordLike, buildPreviouslyFailedExtractionMessage } from "./attachment-processing.ts";
import type { UploadedAttachment } from "./attachment-types.ts";

export function selectAttachmentsForTurn(
  attachments: AttachmentRecordLike[],
  requestedAttachmentIds: string[],
): AttachmentRecordLike[] {
  const attachmentById = new Map(
    attachments.map((attachment) => [attachment.id, attachment]),
  );

  if (requestedAttachmentIds.length > 0) {
    const missingAttachmentIds = requestedAttachmentIds.filter(
      (attachmentId) => !attachmentById.has(attachmentId),
    );
    if (missingAttachmentIds.length > 0) {
      throw new ApiError(
        `Unknown attachment IDs: ${missingAttachmentIds.join(", ")}`,
        400,
      );
    }

    const selected = requestedAttachmentIds.map((id) => attachmentById.get(id)!).filter(Boolean) as AttachmentRecordLike[];

    const failed = selected.find((a) => a.status === "failed");
    if (failed) {
      throw new ApiError(buildPreviouslyFailedExtractionMessage(failed), 422);
    }

    return selected;
  }

  // Default: exclude attachments that previously failed processing
  return attachments.filter((a) => a.status !== "failed");
}

export async function resolveAttachmentsForTurn(
  attachmentsForTurn: AttachmentRecordLike[],
  extractor?: (attachment: AttachmentRecordLike) => Promise<UploadedAttachment>,
): Promise<UploadedAttachment[]> {
  const results: UploadedAttachment[] = [];
  for (const attachment of attachmentsForTurn) {
    try {
      const resolved = extractor ? await extractor(attachment) : normalizeAttachmentRecord(attachment);
      results.push(resolved);
    } catch (err) {
      // Map parser/extraction failures to ApiError 422 with contextual info
      const name = attachment.originalName || attachment.id;
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiError(`${name}: ${msg}`, 422);
    }
  }

  return results;
}