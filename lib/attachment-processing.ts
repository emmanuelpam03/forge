import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
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
} from "@/lib/attachment-types";

export type AttachmentInput = {
  chatId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
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
  const extension = getAttachmentExtension(safeName) || extname(input.fileName).toLowerCase();
  const fileName = `${attachmentId}${extension || ""}`;
  const storageDir = join(process.cwd(), "public", "uploads", input.chatId, attachmentId);
  const storagePath = join(storageDir, fileName);

  await mkdir(storageDir, { recursive: true });
  await writeFile(storagePath, input.buffer);

  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const storageUrl = `/uploads/${input.chatId}/${attachmentId}/${fileName}`;

  return { storagePath, storageUrl, checksum };
}

async function parsePdf(buffer: Buffer): Promise<ParsedAttachment> {
  const parserModule = await import("pdf-parse");
  const parser = (parserModule as { default?: (input: Buffer) => Promise<{ text?: string; numpages?: number }> }).default ??
    (parserModule as unknown as (input: Buffer) => Promise<{ text?: string; numpages?: number }>);
  const result = await parser(buffer);

  const text = (result.text ?? "").trim();
  return {
    text,
    summary: summarizeAttachmentText(text || "PDF uploaded. No extractable text found.", 320),
    pageCount: result.numpages ?? undefined,
  };
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
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  const text = rows
    .slice(0, 25)
    .map((row) => (Array.isArray(row) ? row.join(", ") : String(row)))
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

function parseImage(buffer: Buffer, name: string): ParsedAttachment {
  try {
    const dimensions = imageSize(buffer);
    return {
      summary: `${name} (${dimensions.width ?? 0}x${dimensions.height ?? 0})`,
      width: dimensions.width ?? undefined,
      height: dimensions.height ?? undefined,
    };
  } catch {
    return { summary: `${name} image uploaded.` };
  }
}

export async function parseAttachmentBuffer(input: AttachmentInput): Promise<ParsedAttachment> {
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const extension = getAttachmentExtension(input.fileName);
  const language = getAttachmentLanguage(input.fileName);

  if (kind === "pdf") {
    return parsePdf(input.buffer);
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
    return parseImage(input.buffer, input.fileName);
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
  const parsed = await parseAttachmentBuffer(input);
  const kind = inferAttachmentKind({ name: input.fileName, mimeType: input.mimeType });
  const { storagePath, storageUrl, checksum } = await persistAttachmentFile(input, input.attachmentId);

  return {
    id: input.attachmentId,
    chatId: input.chatId,
    name: sanitizeAttachmentName(input.fileName),
    originalName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksum,
    kind,
    status: "ready",
    storageUrl,
    storagePath,
    uploadedAt: new Date().toISOString(),
    extractedText: parsed.text,
    summary: parsed.summary,
    pageCount: parsed.pageCount,
    width: parsed.width,
    height: parsed.height,
    language: parsed.language,
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
    .map((attachment, index) => {
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
