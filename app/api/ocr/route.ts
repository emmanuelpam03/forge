import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { error as logError } from "@/lib/logger";
import { ensureAttachmentParsed, normalizeAttachmentRecord } from "@/lib/attachment-processing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chatId = String(body?.chatId ?? "").trim();
    const attachmentId = String(body?.attachmentId ?? "").trim();

    if (!chatId || !attachmentId) {
      return NextResponse.json({ error: "chatId and attachmentId are required" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.chatId !== chatId) {
      return NextResponse.json({ error: "Attachment not found for chat." }, { status: 404 });
    }

    // Build the AttachmentRecordLike shape expected by ensureAttachmentParsed
    const record = {
      id: attachment.id,
      chatId: attachment.chatId,
      name: attachment.name,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      storageUrl: attachment.storageUrl,
      storagePath: attachment.storagePath,
      checksum: attachment.checksum,
      kind: attachment.kind,
      status: attachment.status,
      extractedText: attachment.extractedText,
      summary: attachment.summary,
      pageCount: attachment.pageCount,
      width: attachment.width,
      height: attachment.height,
      language: attachment.language,
      createdAt: attachment.createdAt,
    };

    // Force OCR for this attachment (on-demand). ensureAttachmentParsed will
    // handle OCR availability and not throw if OCR isn't available.
    const parsed = await ensureAttachmentParsed(record, { forceOcr: true });

    return NextResponse.json({ attachment: parsed });
  } catch (err) {
    logError("ocr_route_failed", { error: err });
    return NextResponse.json({ error: "Failed to run OCR on attachment." }, { status: 500 });
  }
}
