import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireServerUser } from "@/lib/server-auth";

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

    if (!attachment || attachment.chat?.userId !== user.id || !attachment.storageUrl) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }


    const search = request.nextUrl.searchParams;
    const download = search.get("download") === "1" || search.get("download") === "true";
    const inline = search.get("inline") === "1" || search.get("inline") === "true";



    const remoteResponse = await fetch(attachment.storageUrl);
    if (!remoteResponse.ok || !remoteResponse.body) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    const mimeType = attachment.mimeType ?? remoteResponse.headers.get("content-type") ?? "application/octet-stream";

    // Force download for risky types or when explicitly requested.
    const shouldAttachment =
      download ||
      (!inline && (mimeType === "application/octet-stream" || mimeType === "application/json"));

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "private, max-age=3600");

    const dispositionType = shouldAttachment ? "attachment" : "inline";
    const prettyName = attachment.originalName || attachment.name || attachmentId;
    headers.set("Content-Disposition", `${dispositionType}; filename="${prettyName}"`);

    // Security: restrict embedding/origins
    headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox");

    return new Response(remoteResponse.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Failed to serve attachment." }, { status: 500 });
  }
}

export const runtime = "nodejs";
