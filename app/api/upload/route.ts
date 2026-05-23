import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { error as logError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  buildUploadedAttachment,
  validateAttachmentCandidate,
} from "@/lib/attachment-processing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session && process.env.NODE_ENV === "production") {
      // In production we require authentication. In local/dev, allow a relaxed
      // flow so developers can test uploads before wiring auth.
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const chatId = String(formData.get("chatId") ?? "").trim();

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const isDev = process.env.NODE_ENV === "development";

    let chat: { id: string; userId?: string } | null = null;
    if (session) {
      // We only need to verify the chat exists; chats are not currently
      // scoped to a user in the schema, so don't attempt to filter by userId.
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true, projectId: true },
      });
    } else {
      // In development allow a relaxed lookup so uploads can be tested before
      // authentication is wired. If the chat doesn't exist, fall back to a
      // placeholder chat for the purpose of storing the file.
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true, projectId: true },
      });

      if (!chat && isDev) {
        chat = { id: chatId, userId: "dev" };
      }
    }

    if (!chat) {
      return NextResponse.json({ error: "Chat not found or access denied." }, { status: 404 });
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
