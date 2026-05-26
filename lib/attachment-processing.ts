import "server-only";

import { createHash } from "node:crypto";
import { imageSize } from "image-size";
import mammoth from "mammoth";
import Papa from "papaparse";
import * as XLSX from "xlsx";
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

function attachmentHasExtractedText(attachment: AttachmentRecordLike): boolean {
  return (attachment.extractedText ?? "").trim().length > 0;
}

export async function ensureAttachmentParsed(
  attachment: AttachmentRecordLike,
  options?: { forceOcr?: boolean },
): Promise<UploadedAttachment> {
  const isComplete =
    attachment.status === "ready" &&
    typeof attachment.summary === "string" &&
    attachmentHasExtractedText(attachment);

  if (isComplete && !options?.forceOcr) {
    return normalizeAttachmentRecord(attachment);
  }

  const storageUrl = attachment.storageUrl ?? "";
  if (!storageUrl) {
    throw new Error(`Attachment ${attachment.id} is missing a storage URL.`);
  }

  const fileName = attachment.originalName || attachment.name;
  const mimeType = attachment.mimeType ?? "application/octet-stream";
  const { buffer } = await fetchAttachmentBytesForParsing(storageUrl);
  const parsed = await parseAttachmentBuffer({
    chatId: attachment.chatId,
    fileName,
    mimeType,
    sizeBytes: attachment.sizeBytes ?? buffer.byteLength,
    buffer,
  }, { forceOcr: Boolean(options?.forceOcr) });

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

type PdfParseResult = {
  text?: string;
  numpages?: number;
};

type PdfParser = (buffer: Buffer) => Promise<PdfParseResult>;

type PdfOcrExtractor = (buffer: Buffer) => Promise<string>;

async function loadPdfParser(): Promise<PdfParser> {
  const parserModule = await import("pdf-parse");
  return (parserModule as { default?: PdfParser }).default ?? (parserModule as unknown as PdfParser);
}

export async function parsePdf(
  buffer: Buffer,
  options?: {
    forceOcr?: boolean;
    parse?: PdfParser;
    extractOcrText?: PdfOcrExtractor;
  },
): Promise<ParsedAttachment> {
  const extractOcrText =
    options?.extractOcrText ?? ((input: Buffer) => extractPdfOcrText(input, { force: true }));

  try {
    const parser = options?.parse ?? (await loadPdfParser());
    const result = await parser(buffer);

    const text = (result.text ?? "").trim();
    if (text) {
      return {
        text,
        summary: summarizeAttachmentText(text || "PDF uploaded. No extractable text found.", 320),
        pageCount: result.numpages ?? undefined,
      };
    }

    const ocrText = await extractOcrText(buffer);
    if (ocrText) {
      return {
        text: ocrText,
        summary: summarizeAttachmentText(ocrText, 320),
        pageCount: result.numpages ?? undefined,
      };
    }

    return {
      text: "",
      summary: summarizeAttachmentText("PDF uploaded. No extractable text found.", 320),
      pageCount: result.numpages ?? undefined,
    };
  } catch {
    const ocrText = await extractOcrText(buffer);
    if (ocrText) {
      return {
        text: ocrText,
        summary: summarizeAttachmentText(ocrText, 320),
      };
    }

    return {
      text: "",
      summary: "PDF uploaded. Failed to extract text.",
      pageCount: undefined,
    };
  }
}

function getPdfOcrMaxPages(): number {
  const configured = Number.parseInt(process.env.PDF_OCR_MAX_PAGES ?? "8", 10);
  if (!Number.isFinite(configured) || configured < 1) {
    return 8;
  }

  return Math.min(configured, 20);
}

async function extractPdfOcrText(
  buffer: Buffer,
  options?: { force?: boolean },
): Promise<string> {
  try {
    if (!options?.force && !(await ocrIsDocumentAvailable())) {
      return "";
    }

    const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("@napi-rs/canvas");

    const pdfjs = pdfjsModule as any;

    const documentTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
    });

    const pdfDocument = await documentTask.promise;
    const maxPages = Math.min(pdfDocument.numPages, getPdfOcrMaxPages());
    const recognizedText: string[] = [];

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
      const context = canvas.getContext("2d");

      await page.render({ canvasContext: context as any, canvas: canvas as any, viewport } as any).promise;

      const imgBuf = canvas.toBuffer("image/png");
      let text = "";
      try {
        if (await ocrIsDocumentAvailable()) {
          text = await ocrExtractText(imgBuf, { lang: "eng", scope: "document" });
        }
      } catch {
        text = "";
      }
      if (text) {
        recognizedText.push(text);
      }
    }

    return recognizedText.join("\n\n").trim();
  } catch (err) {
    try {
      console.warn(
        "extractPdfOcrText failed:",
        (err as Error)?.message ?? String(err),
      );
    } catch {}
    return "";
  }
}

async function parseDocx(buffer: Buffer): Promise<ParsedAttachment> {
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value ?? "").trim();
  return {
    text,
    summary: summarizeAttachmentText(text || "Document uploaded. No extractable text found.", 320),
  };
}

function parseCsv(buffer: Buffer): ParsedAttachment {
  const csvText = buffer.toString("utf8");
  const parsed = Papa.parse(csvText, { skipEmptyLines: true }) as { data: unknown[] };
  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  const text = rows
    .slice(0, 25)
    .map((row: unknown) => (Array.isArray(row) ? row.join(", ") : String(row)))
    .join("\n");

  return {
    text,
    summary: summarizeAttachmentText(text || "CSV uploaded.", 320),
  };
}

function parseXlsx(buffer: Buffer): ParsedAttachment {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

  if (!sheet) {
    return { summary: "Spreadsheet uploaded. No readable sheets found." };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  const text = rows
    .slice(0, 25)
    .map((row) => JSON.stringify(row))
    .join("\n");

  return {
    text,
    summary: summarizeAttachmentText(text || "Spreadsheet uploaded.", 320),
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

import {
  extractText as ocrExtractText,
  isAvailable as ocrIsAvailable,
  isDocumentOcrEnabled as ocrIsDocumentOcrEnabled,
  isOcrEnabled as ocrIsEnabled,
} from "./ocr.ts";

async function ocrIsDocumentAvailable(): Promise<boolean> {
  if (!(await ocrIsDocumentOcrEnabled())) {
    return false;
  }

  return ocrIsAvailable("document");
}

// Helper: conservative heuristic to decide whether OCR should run for an image.
function shouldRunOcrForImage(fileName: string, mimeType: string): boolean {
  // Explicit opt-in via ENABLE_IMAGE_OCR
  if (process.env.ENABLE_IMAGE_OCR === "1") return true;

  const lower = fileName.toLowerCase();
  // Common indicators that the image likely contains text
  const indicators = ["screenshot", "scan", "document", "receipt", "invoice", "ocr"];
  for (const ind of indicators) {
    if (lower.includes(ind)) return true;
  }

  // Do not run OCR by default for images.
  return false;
}

export async function parseImageAttachment(
  buffer: Buffer,
  name: string,
  extractor?: (buffer: Buffer) => Promise<string>,
  forceOcr: boolean = false,
): Promise<ParsedAttachment> {
  let text = "";
  if (typeof extractor === "function") {
    try {
      text = (await extractor(buffer)).trim();
    } catch {
      text = "";
    }
  } else {
    try {
      const runOcr = forceOcr || shouldRunOcrForImage(name, "");
      if (runOcr && (await ocrIsAvailable())) {
        text = (await ocrExtractText(buffer, { lang: "eng" })).trim();
      }
    } catch {
      text = "";
    }
  }

  if (text) {
    return {
      text,
      summary: summarizeAttachmentText(text, 320),
    };
  }

  try {
    const dimensions = imageSize(buffer);
    return {
      summary: `${name} (${dimensions.width ?? 0}x${dimensions.height ?? 0})`,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch {
    return { summary: `${name} image uploaded.` };
  }
}

export async function parseAttachmentBuffer(input: AttachmentInput, options?: { forceOcr?: boolean }): Promise<ParsedAttachment> {
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const extension = getAttachmentExtension(input.fileName);
  const language = getAttachmentLanguage(input.fileName);

  if (kind === "pdf") {
    return parsePdf(input.buffer, { forceOcr: Boolean(options?.forceOcr) });
  }

  if (kind === "document" && extension === ".docx") {
    return parseDocx(input.buffer);
  }

  if (kind === "spreadsheet" && extension === ".xlsx") {
    return parseXlsx(input.buffer);
  }

  if (kind === "spreadsheet" && extension === ".csv") {
    return parseCsv(input.buffer);
  }

  if (kind === "image") {
    return await parseImageAttachment(input.buffer, input.fileName, undefined, Boolean(options?.forceOcr));
  }

  if (kind === "code" || kind === "text" || kind === "json" || kind === "document") {
    return {
      ...parseText(input.buffer, kind, input.fileName),
      language: kind === "code" || kind === "json" ? language : undefined,
    };
  }

  return {
    summary: `${input.fileName} uploaded.`,
  };
}

export async function buildUploadedAttachment(input: AttachmentInput & { attachmentId: string }): Promise<UploadedAttachment> {
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const { storagePath, storageUrl, checksum } = await persistAttachmentFile(input, input.attachmentId);
  const prisma = (await import("./prisma.ts")).default;
  const shouldDeferParsing = input.sizeBytes >= 5 * 1024 * 1024;
  const parsed = shouldDeferParsing ? null : await parseAttachmentBuffer(input);
  const status = shouldDeferParsing ? "processing" : "ready";

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
    // Only request OCR in the background if heuristics indicate text likely
    // (e.g., filename suggests a document) — otherwise background job will do
    // lightweight parsing without OCR by default.
    const requireOcr =
      shouldRunOcrForImage(input.fileName, input.mimeType) || kind === "pdf";
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
