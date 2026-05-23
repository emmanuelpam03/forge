import { NextRequest, NextResponse } from "next/server";
import { error as logError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  buildUploadedAttachment,
  validateAttachmentCandidate,
} from "@/lib/attachment-processing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chatId = String(formData.get("chatId") ?? "").trim();

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, projectId: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    const MAX_FILES_PER_UPLOAD = 10;

    const fileEntries = formData
      .getAll("file")
      .filter((entry): entry is File => entry instanceof File);

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    if (fileEntries.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload.` },
        { status: 400 }
      );
    }

    const attachments = [];

    for (const file of fileEntries) {
      const validationError = validateAttachmentCandidate({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      const attachmentId = crypto.randomUUID();
      const buffer = Buffer.from(await file.arrayBuffer());

      const attachment = await buildUploadedAttachment({
        chatId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        buffer,
        attachmentId,
      });

      attachments.push(attachment);
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    logError("upload_route_failed", { error });
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }
}
