import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireServerUser } from "@/lib/server-auth";
import { inferAttachmentKind } from "@/lib/attachment-types";

function validatePathSegment(value: string, label: string): string {
  const normalized = String(value ?? "").trim();
  const safePattern = /^[A-Za-z0-9_-]+$/;
  if (!normalized || normalized.includes("..") || normalized.includes("/") || normalized.includes("\\") || !safePattern.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }
  return normalized;
}

export async function GET(request: NextRequest, { params }: { params: { chatId?: string; attachmentId?: string } }) {
  try {
    const chatId = validatePathSegment(params.chatId ?? "", "chatId");
    const attachmentId = validatePathSegment(params.attachmentId ?? "", "attachmentId");

    // Require auth and ownership
    let user: any;
    try {
      user = await requireServerUser(request as unknown as Request);
    } catch (err) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { chatId, id: attachmentId },
      include: { chat: { select: { userId: true } } },
    });

    if (!attachment || attachment.chat?.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const resolved = {
      id: attachmentId,
      chatId,
      name: attachment.name,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType ?? "application/octet-stream",
      sizeBytes: attachment.sizeBytes ?? 0,
      checksum: attachment.checksum ?? "",
      kind: attachment.kind && attachment.kind !== "" ? attachment.kind : inferAttachmentKind({ name: attachment.name, mimeType: attachment.mimeType ?? "application/octet-stream" }),
      status: "ready",
      storageUrl: attachment.storageUrl ?? `/api/attachments/${chatId}/${attachmentId}`,
      storagePath: attachment.storagePath ?? "",
      uploadedAt: attachment.createdAt.toISOString(),
    };

    return NextResponse.json(resolved);
  } catch {
    return NextResponse.json({ error: "Failed to load metadata" }, { status: 500 });
  }
}

export const runtime = "nodejs";
