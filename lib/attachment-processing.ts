import "server-only";

import { createHash } from "node:crypto";
import {
  ATTACHMENT_MAX_BYTES,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ALLOWED_ATTACHMENT_MIME_PREFIXES,
  type AttachmentContextChunk,
  inferAttachmentKind,
  sanitizeAttachmentName,
  summarizeAttachmentText,
  getAttachmentExtension,
  getAttachmentLanguage,
  type UploadedAttachment,
} from "./attachment-types.ts";
import { queueJob } from "./job-queue.ts";
import { uploadAttachmentToCloudinary } from "./cloudinary.ts";
import { extractTextWithUnstructured } from "./unstructured.ts";

export type AttachmentInput = {
  chatId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type AttachmentRecordLike = {
  id: string;
  chatId: string;
  name: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storageUrl: string | null;
  storagePath: string | null;
  checksum: string | null;
  kind: string | null;
  status: string | null;
  extractedText: string | null;
  summary: string | null;
  pageCount: number | null;
  width: number | null;
  height: number | null;
  language: string | null;
  createdAt: Date;
};

type ParsedAttachment = {
  text?: string;
  summary?: string;
  pageCount?: number;
  width?: number;
  height?: number;
  language?: string;
};

export function validateAttachmentCandidate(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): string | null {
  if (input.sizeBytes <= 0) {
    return "File is empty.";
  }

  if (input.sizeBytes > ATTACHMENT_MAX_BYTES) {
    return "File exceeds the 50 MB upload limit.";
  }

  const extension = getAttachmentExtension(input.fileName);
  const normalizedMimeType = input.mimeType.toLowerCase();
  const mimeAllowed = ALLOWED_ATTACHMENT_MIME_PREFIXES.some((prefix) =>
    normalizedMimeType.startsWith(prefix),
  );

  if (extension === ".svg" || normalizedMimeType.includes("svg+xml")) {
    return "SVG images are not supported yet.";
  }

  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) && !mimeAllowed) {
    return "This file type is not supported yet.";
  }

  return null;
}

export async function persistAttachmentFile(
  input: AttachmentInput,
  attachmentId: string,
): Promise<{ storagePath: string; storageUrl: string; checksum: string }> {
  const safeName = sanitizeAttachmentName(input.fileName);
  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const uploadResult = await uploadAttachmentToCloudinary({
    chatId: input.chatId,
    attachmentId,
    buffer: input.buffer,
    fileName: safeName,
    mimeType: input.mimeType,
  });

  return {
    storagePath: uploadResult.public_id,
    storageUrl: uploadResult.secure_url,
    checksum,
  };
}

export function normalizeAttachmentRecord(
  attachment: AttachmentRecordLike,
): UploadedAttachment {
  const name = attachment.name;
  const mimeType = attachment.mimeType ?? "application/octet-stream";

  return {
    id: attachment.id,
    chatId: attachment.chatId,
    name,
    originalName: attachment.originalName,
    mimeType,
    sizeBytes: attachment.sizeBytes ?? 0,
    checksum: attachment.checksum ?? "",
    kind:
      attachment.kind && attachment.kind !== ""
        ? (attachment.kind as UploadedAttachment["kind"])
        : inferAttachmentKind({ name, mimeType }),
    status:
      attachment.status === "uploading" ||
      attachment.status === "processing" ||
      attachment.status === "ready" ||
      attachment.status === "failed"
        ? attachment.status
        : "ready",
    storageUrl: attachment.storageUrl ?? "",
    storagePath: attachment.storagePath ?? "",
    uploadedAt:
      attachment.createdAt instanceof Date
        ? attachment.createdAt.toISOString()
        : new Date().toISOString(),
    extractedText: attachment.extractedText ?? undefined,
    summary: attachment.summary ?? undefined,
    pageCount: attachment.pageCount ?? undefined,
    width: attachment.width ?? undefined,
    height: attachment.height ?? undefined,
    language: attachment.language ?? undefined,
  };
}

async function fetchAttachmentBytesForParsing(storageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(storageUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch attachment bytes from ${storageUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

function attachmentHasParseResult(attachment: AttachmentRecordLike): boolean {
  return (
    (attachment.extractedText ?? "").trim().length > 0 ||
    (attachment.summary ?? "").trim().length > 0
  );
}

export async function ensureAttachmentParsed(
  attachment: AttachmentRecordLike,
  options?: { forceOcr?: boolean },
): Promise<UploadedAttachment> {
  if (attachment.status === "failed") {
    throw new Error(
      attachment.summary?.trim() ||
        `Attachment ${attachment.originalName || attachment.name} previously failed parsing.`,
    );
  }

  const isComplete =
    attachment.status === "ready" &&
    attachmentHasParseResult(attachment);

  if (isComplete && !options?.forceOcr) {
    return normalizeAttachmentRecord(attachment);
  }

  const storageUrl = attachment.storageUrl ?? "";
  if (!storageUrl) {
    throw new Error(`Attachment ${attachment.id} is missing a storage URL.`);
  }

  const fileName = attachment.originalName || attachment.name;
  const mimeType = attachment.mimeType ?? "application/octet-stream";
  const isPdf = attachment.kind === "pdf" || mimeType === "application/pdf";
  const { buffer } = await fetchAttachmentBytesForParsing(storageUrl);
  let parsed: ParsedAttachment;
  try {
    parsed = await parseAttachmentBuffer(
      {
        chatId: attachment.chatId,
        fileName,
        mimeType,
        sizeBytes: attachment.sizeBytes ?? buffer.byteLength,
        buffer,
      },
      { forceOcr: Boolean(options?.forceOcr) },
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Failed to extract text from attachment.";
    const prisma = (await import("./prisma.ts")).default;
    await prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        status: "failed",
        summary: reason,
      },
    });
    throw new Error(reason);
  }

  if (isPdf && !(parsed.text ?? "").trim()) {
    try {
      console.warn("PDF parse produced empty text after OCR attempt", {
        attachmentId: attachment.id,
        chatId: attachment.chatId,
        forceOcr: Boolean(options?.forceOcr),
      });
    } catch {}
  }

  const prisma = (await import("./prisma.ts")).default;
  await prisma.attachment.update({
    where: { id: attachment.id },
    data: {
      status: "ready",
      extractedText: parsed.text ?? null,
      summary: parsed.summary ?? null,
      pageCount: parsed.pageCount ?? null,
      width: parsed.width ?? null,
      height: parsed.height ?? null,
      language: parsed.language ?? null,
    },
  });

  return normalizeAttachmentRecord({
    ...attachment,
    status: "ready",
    extractedText: parsed.text ?? null,
    summary: parsed.summary ?? null,
    pageCount: parsed.pageCount ?? null,
    width: parsed.width ?? null,
    height: parsed.height ?? null,
    language: parsed.language ?? null,
  });
}

function parseCsv(buffer: Buffer): ParsedAttachment {
  const csvText = buffer.toString("utf8");
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(",").map((part) => part.trim()));

  const text = rows
    .slice(0, 25)
    .map((row) => row.join(", "))
    .join("\n");

  return {
    text,
    summary: summarizeAttachmentText(text || "CSV uploaded.", 320),
  };
}

function parseText(buffer: Buffer, kind: string, name: string): ParsedAttachment {
  const raw = buffer.toString("utf8").trim();

  if (!raw) {
    return { summary: `${kind} uploaded. No text content found.` };
  }

  if (getAttachmentExtension(name) === ".json") {
    try {
      const parsed = JSON.parse(raw);
      const text = JSON.stringify(parsed, null, 2);
      return {
        text,
        summary: summarizeAttachmentText(text, 320),
      };
    } catch {
      // fall through to raw text
    }
  }

  return {
    text: raw,
    summary: summarizeAttachmentText(raw, 320),
  };
}


export async function parseAttachmentBuffer(input: AttachmentInput, options?: { forceOcr?: boolean }): Promise<ParsedAttachment> {
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const extension = getAttachmentExtension(input.fileName);
  const language = getAttachmentLanguage(input.fileName);

  if (kind === "spreadsheet" && extension === ".csv") {
    return parseCsv(input.buffer);
  }

  const isPlainTextDocument =
    kind === "document" &&
    (extension === ".txt" || extension === ".md" || extension === ".rtf");

  if (kind === "code" || kind === "text" || kind === "json" || isPlainTextDocument) {
    return {
      ...parseText(input.buffer, kind, input.fileName),
      language: kind === "code" || kind === "json" ? language : undefined,
    };
  }

  void options;
  const extracted = await extractTextWithUnstructured({
    fileName: input.fileName,
    mimeType: input.mimeType,
    buffer: input.buffer,
  });
  const text = extracted.text.trim();

  return {
    text,
    summary: summarizeAttachmentText(
      text || `${input.fileName} uploaded. No extractable text found.`,
      320,
    ),
    pageCount: extracted.pageCount,
  };
}

export async function buildUploadedAttachment(input: AttachmentInput & { attachmentId: string }): Promise<UploadedAttachment> {
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const { storagePath, storageUrl, checksum } = await persistAttachmentFile(input, input.attachmentId);
  const prisma = (await import("./prisma.ts")).default;
  const shouldDeferParsing = input.sizeBytes >= 5 * 1024 * 1024;
  let parsed: ParsedAttachment | null = null;
  let status: "processing" | "ready" | "failed" = shouldDeferParsing ? "processing" : "ready";

  if (!shouldDeferParsing) {
    try {
      parsed = await parseAttachmentBuffer(input);
    } catch (error) {
      status = "failed";
      const failureMessage =
        error instanceof Error ? error.message : "Failed to extract attachment text.";
      parsed = {
        summary: failureMessage,
      };
    }
  }

  // Persist metadata to the database (best-effort) using the typed Prisma client.
  try {
    await prisma.attachment.create({
      data: {
        id: input.attachmentId,
        chatId: input.chatId,
        name: sanitizeAttachmentName(input.fileName),
        originalName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageUrl,
        storagePath,
        checksum,
        kind,
        status,
        extractedText: parsed?.text ?? null,
        summary: parsed?.summary ?? null,
        pageCount: parsed?.pageCount ?? null,
        width: parsed?.width ?? null,
        height: parsed?.height ?? null,
        language: parsed?.language ?? null,
      },
    });
  } catch (err) {
    // Don't fail the upload if DB persistence fails; log and continue.
    try {
      console.error("Failed to persist attachment metadata:", err);
    } catch {}
  }

  if (shouldDeferParsing) {
    const requireOcr = false;
    try {
      await queueJob("processAttachment", { chatId: input.chatId, attachmentId: input.attachmentId, requireOcr });
    } catch (err) {
      try {
        console.error("Failed to queue processAttachment job", { attachmentId: input.attachmentId, chatId: input.chatId, error: err });
      } catch {}

      // Mark attachment as failed so UI/state doesn't remain stuck in 'processing'
      try {
        await prisma.attachment.update({ where: { id: input.attachmentId }, data: { status: "failed" } });
      } catch (err2) {
        try {
          console.error("Failed to mark attachment as failed after queue error", { attachmentId: input.attachmentId, error: err2 });
        } catch {}
      }
    }
  }

  return {
    id: input.attachmentId,
    chatId: input.chatId,
    name: sanitizeAttachmentName(input.fileName),
    originalName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksum,
    kind,
    status,
    storageUrl,
    storagePath,
    uploadedAt: new Date().toISOString(),
    extractedText: parsed?.text,
    summary: parsed?.summary,
    pageCount: parsed?.pageCount,
    width: parsed?.width,
    height: parsed?.height,
    language: parsed?.language,
  };
}

function chunkText(text: string, size: number = 700): AttachmentContextChunk[] {
  const normalized = text.trim().replace(/\r\n/g, "\n");
  if (!normalized) {
    return [];
  }

  const chunks: AttachmentContextChunk[] = [];
  const paragraphs = normalized.split(/\n{2,}/);

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n");
    const joined = lines.join(" ").trim();
    if (!joined) {
      continue;
    }

    for (let index = 0; index < joined.length; index += size) {
      const content = joined.slice(index, index + size).trim();
      if (content) {
        chunks.push({ label: `chunk-${chunks.length + 1}`, content });
      }
    }
  }

  return chunks;
}

// Clean extracted text: normalize line endings, remove common page-number
// and header/footer artifacts, collapse repeated blank lines, and trim.
export function cleanExtractedText(input: string): string {
  if (!input) return "";
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove common page number lines like "Page 1 of 10" or standalone numbers
  text = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true; // keep blank lines for now
      // Remove verbose page number patterns like "1 of 10" but preserve
      // explicit "Page N" markers which are useful for page splitting.
      if (/^\d+\s*of\s*\d+$/i.test(trimmed)) return false;
      if (/^\d+$/.test(trimmed) && trimmed.length <= 4) return false;
      // common footer/header separators
      if (/^[-_=]{3,}$/.test(trimmed)) return false;
      return true;
    })
    .join("\n");

  // Remove repeated header/footer lines that appear many times
  const lines = text.split("\n");
  const counts = new Map<string, number>();
  for (const line of lines.slice(0, 50)) {
    const key = line.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const repeatedHeaders = new Set<string>();
  for (const [k, v] of counts.entries()) {
    if (v > 1) repeatedHeaders.add(k);
  }

  const filtered = lines.filter((l) => !repeatedHeaders.has(l.trim().toLowerCase()));

  // Collapse multiple blank lines to a maximum of two
  const collapsed = filtered.join("\n").replace(/\n{3,}/g, "\n\n");

  // Trim trailing/leading whitespace
  return collapsed.trim();
}

// Structure cleaned text into pages. Tries to detect form-feed or "Page N" markers;
// falls back to fixed-size chunking when needed.
export function structureTextByPage(cleaned: string, approxCharsPerPage = 2000): { title?: string; pages: string[]; summary: string } {
  const result = { title: undefined as string | undefined, pages: [] as string[], summary: "" };
  if (!cleaned) return result;

  // Try to split on form-feed
  if (cleaned.includes("\f")) {
    result.pages = cleaned.split(/\f+/).map((p) => p.trim()).filter(Boolean);
  } else {
    // Try to split on explicit 'Page N' markers
    const pageMarkerRegex = /(^|\n)(?:page\s+\d+[:\-]?\s*)/i;
    if (pageMarkerRegex.test(cleaned)) {
      const parts = cleaned.split(/\n(?=page\s+\d+)/i);
      result.pages = parts.map((p) => p.trim()).filter(Boolean);
    } else {
      // Fallback: chunk by approxCharsPerPage
      for (let i = 0; i < cleaned.length; i += approxCharsPerPage) {
        result.pages.push(cleaned.slice(i, i + approxCharsPerPage).trim());
      }
    }
  }

  // Try to detect a document title on the first page (first non-empty line)
  if (result.pages.length > 0) {
    const firstLines = result.pages[0].split("\n").map((l) => l.trim()).filter(Boolean);
    if (firstLines.length > 0 && firstLines[0].length < 200 && firstLines[0].split(" ").length < 12) {
      result.title = firstLines[0];
      // remove title line from page 1
      result.pages[0] = result.pages[0].split("\n").slice(1).join("\n").trim();
    }
  }

  // Build a short internal summary (use existing summarizer)
  try {
    const joined = result.pages.join("\n\n").trim();
    result.summary = summarizeAttachmentText(joined, 200);
  } catch {
    result.summary = "";
  }

  return result;
}

// Public helper: get cleaned, structured text for an attachment. If `extractedText`
// exists on the attachment, prefer that; otherwise attempt to fetch and parse.
export async function getCleanedAttachmentText(attachment: UploadedAttachment): Promise<string> {
  let raw = (attachment.extractedText ?? "") as string;

  if (!raw || raw.trim().length === 0) {
    if (attachment.storageUrl) {
      try {
        const { buffer } = await fetchAttachmentBytes(attachment.storageUrl);
        const parsed = await parseAttachmentBuffer(
          { chatId: attachment.chatId, fileName: attachment.originalName || attachment.name, mimeType: attachment.mimeType || "", sizeBytes: attachment.sizeBytes ?? 0, buffer },
          { forceOcr: true },
        );
        raw = parsed.text ?? "";
      } catch (err) {
        raw = "";
      }
    }
  }

  const cleaned = cleanExtractedText(raw || "");
  const structured = structureTextByPage(cleaned);

  const parts: string[] = [];
  if (structured.title) parts.push(structured.title);
  structured.pages.forEach((p, i) => {
    parts.push(`Page ${i + 1}:`);
    parts.push(p || "");
  });
  if (structured.summary) {
    parts.push("Summary:");
    parts.push(structured.summary);
  }

  return parts.join("\n\n").trim();
}

function lexicalScore(query: string, content: string): number {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const normalizedContent = content.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) {
    return normalizedContent.length > 0 ? 1 : 0;
  }

  let score = 0;
  for (const word of queryWords) {
    if (normalizedContent.includes(word)) {
      score += 1;
    }
  }

  return score;
}

export function formatAttachmentContext(
  attachments: UploadedAttachment[] | undefined,
  query: string,
): string {
  if (!attachments || attachments.length === 0) {
    return "";
  }

  const sections = attachments
    .filter((attachment) => attachment.status !== "failed")
    .map((attachment, index) => ({
      attachment,
      index,
      score:
        lexicalScore(query, attachment.name) * 3 +
        lexicalScore(query, attachment.summary ?? "") * 2 +
        lexicalScore(query, attachment.extractedText ?? ""),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.attachment.uploadedAt === right.attachment.uploadedAt) {
        return left.index - right.index;
      }

      return left.attachment.uploadedAt.localeCompare(right.attachment.uploadedAt);
    })
    .slice(0, 6)
    .map(({ attachment }, index) => {
      const chunks = attachment.extractedText ? chunkText(attachment.extractedText) : [];
      const rankedChunks = chunks
        .map((chunk) => ({ ...chunk, score: lexicalScore(query, chunk.content) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      const relevantChunks = rankedChunks.length > 0 ? rankedChunks : chunks.slice(0, 2);
      const chunkTextValue = relevantChunks.length > 0
        ? relevantChunks.map((chunk) => `     [${chunk.label}] ${chunk.content}`).join("\n")
        : "     No extracted text available.";

      return [
        `${index + 1}. ${attachment.name}`,
        `   - Type: ${attachment.kind.toUpperCase()}`,
        `   - Status: ${attachment.status}`,
        attachment.summary ? `   - Summary: ${attachment.summary}` : null,
        attachment.pageCount ? `   - Pages: ${attachment.pageCount}` : null,
        attachment.width && attachment.height ? `   - Dimensions: ${attachment.width}x${attachment.height}` : null,
        chunkTextValue ? `   - Relevant Chunks:\n${chunkTextValue}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    });

  return [`Attached Files:`, ...sections].join("\n\n");
}

export type AttachmentMessageContentBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
        detail?: "auto" | "low" | "high";
      };
    };

const attachmentImageDataUrlCache = new Map<string, string>();

function getAttachmentCacheKey(attachment: UploadedAttachment): string {
  return attachment.checksum || attachment.storagePath || attachment.id;
}

async function fetchAttachmentBytes(storageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(storageUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch attachment bytes from ${storageUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

async function toDataUrl(storageUrl: string, mimeType: string): Promise<string> {
  if (storageUrl.startsWith("data:")) {
    return storageUrl;
  }

  const { buffer, mimeType: resolvedMimeType } = await fetchAttachmentBytes(storageUrl);
  return `data:${resolvedMimeType || mimeType};base64,${buffer.toString("base64")}`;
}

function scoreAttachmentForQuery(attachment: UploadedAttachment, query: string): number {
  return (
    lexicalScore(query, attachment.name) * 3 +
    lexicalScore(query, attachment.summary ?? "") * 2 +
    lexicalScore(query, attachment.extractedText ?? "")
  );
}

export async function buildAttachmentMultimodalBlocks(
  attachments: UploadedAttachment[] | undefined,
  query: string,
): Promise<AttachmentMessageContentBlock[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const imageAttachments = attachments
    .filter((attachment) => attachment.status !== "failed" && attachment.kind === "image" && attachment.storageUrl)
    .map((attachment, index) => ({
      attachment,
      index,
      score: scoreAttachmentForQuery(attachment, query),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.attachment.uploadedAt === right.attachment.uploadedAt) {
        return left.index - right.index;
      }

      return left.attachment.uploadedAt.localeCompare(right.attachment.uploadedAt);
    })
    .slice(0, 4)
    .map(({ attachment }) => attachment);

  const blocks: AttachmentMessageContentBlock[] = [];

  if (imageAttachments.length > 0) {
    blocks.push({
      type: "text",
      text: `Uploaded images are part of the current conversation context: ${imageAttachments.map((attachment) => attachment.name).join(", ")}. Analyze them directly when they matter to the question.`,
    });
  }

  for (const attachment of imageAttachments) {
    const storageUrl = attachment.storageUrl;
    const canUseRemoteUrl =
      storageUrl.startsWith("https://") || storageUrl.startsWith("http://");

    let imageUrl = storageUrl;

    if (!canUseRemoteUrl) {
      const cacheKey = getAttachmentCacheKey(attachment);
      let dataUrl = attachmentImageDataUrlCache.get(cacheKey);

      if (!dataUrl) {
        try {
          dataUrl = await toDataUrl(
            storageUrl,
            attachment.mimeType || "image/png",
          );
          attachmentImageDataUrlCache.set(cacheKey, dataUrl);
        } catch {
          dataUrl = storageUrl;
        }
      }

      imageUrl = dataUrl;
    }

    blocks.push({
      type: "image_url",
      image_url: {
        url: imageUrl,
        detail: "auto",
      },
    });
  }

  return blocks;
}
