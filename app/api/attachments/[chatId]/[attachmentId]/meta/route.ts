import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { inferAttachmentKind } from "@/lib/attachment-types";

function extensionToMime(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    case ".md":
      return "text/markdown";
    case ".json":
      return "application/json";
    case ".csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
}

function validatePathSegment(value: string, label: string): string {
  const normalized = String(value ?? "").trim();
  const safePattern = /^[A-Za-z0-9_-]+$/;
  if (!normalized || normalized !== basename(normalized) || normalized.includes("..") || normalized.includes("/") || normalized.includes("\\") || !safePattern.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }
  return normalized;
}

export async function GET(request: NextRequest, { params }: { params: { chatId?: string; attachmentId?: string } }) {
  try {
    const chatId = validatePathSegment(params.chatId ?? "", "chatId");
    const attachmentId = validatePathSegment(params.attachmentId ?? "", "attachmentId");

    const dir = join(process.cwd(), "public", "uploads", chatId, attachmentId);
    const files = await readdir(dir).catch(() => []);
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fileName = files[0];
    const filePath = join(dir, fileName);
    const stats = await stat(filePath);
    const ext = extname(fileName).toLowerCase();
    const mimeType = _extensionToMime(ext);

    const resolved = {
      id: attachmentId,
      chatId,
      name: fileName,
      originalName: fileName,
      mimeType,
      sizeBytes: stats.size,
      checksum: "",
      kind: inferAttachmentKind({ name: fileName, mimeType }),
      status: "ready",
      storageUrl: `/api/attachments/${chatId}/${attachmentId}`,
      storagePath: filePath,
      uploadedAt: stats.mtime.toISOString(),
    };

    return NextResponse.json(resolved);
  } catch (err) {
    return NextResponse.json({ error: "Failed to load metadata" }, { status: 500 });
  }
}

export const runtime = "nodejs";
