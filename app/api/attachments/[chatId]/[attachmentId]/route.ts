import { NextRequest } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { NextResponse } from "next/server";

function validatePathSegment(value: string, label: string): string {
  const normalized = String(value ?? "").trim();
  const safePattern = /^[A-Za-z0-9_-]+$/;
  if (!normalized || normalized !== basename(normalized) || normalized.includes("..") || normalized.includes("/") || normalized.includes("\\") || !safePattern.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }
  return normalized;
}

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

export async function GET(request: NextRequest, { params }: { params: { chatId?: string; attachmentId?: string } }) {
  try {
    const chatId = validatePathSegment(params.chatId ?? "", "chatId");
    const attachmentId = validatePathSegment(params.attachmentId ?? "", "attachmentId");

    const downloadsDir = join(process.cwd(), "public", "uploads", chatId, attachmentId);
    const files = await readdir(downloadsDir).catch(() => []);
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    // Pick the first file stored for this attachment id.
    const fileName = files[0];
    const filePath = join(downloadsDir, fileName);
    const ext = extname(fileName).toLowerCase();
    const mimeType = extensionToMime(ext);

    const search = request.nextUrl.searchParams;
    const download = search.get("download") === "1" || search.get("download") === "true";
    const inline = search.get("inline") === "1" || search.get("inline") === "true";

    // Force download for risky types
    const forceDownloadExts = new Set([".html", ".htm", ".svg"]);
    const shouldAttachment = download || forceDownloadExts.has(ext) || (!inline && (mimeType === "application/octet-stream" || mimeType === "application/json"));

    const fileBuffer = await readFile(filePath);

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", String(fileBuffer.byteLength));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "private, max-age=3600");

    const dispositionType = shouldAttachment ? "attachment" : "inline";
    // Use the original filename if present after the id prefix, otherwise fallback
    const prettyName = fileName.replace(new RegExp(`^${attachmentId}`), "") || fileName;
    headers.set("Content-Disposition", `${dispositionType}; filename="${prettyName}"`);

    // Security: restrict embedding/origins
    headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox");

    return new Response(fileBuffer, { status: 200, headers });
  } catch (err) {
    return NextResponse.json({ error: "Failed to serve attachment." }, { status: 500 });
  }
}

export const runtime = "nodejs";
