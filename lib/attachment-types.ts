export type AttachmentStatus = "uploading" | "processing" | "ready" | "failed";

export type AttachmentKind =
  | "image"
  | "pdf"
  | "document"
  | "code"
  | "spreadsheet"
  | "text"
  | "json"
  | "audio"
  | "video"
  | "other";

export type AttachmentPreviewMode = "image" | "pdf" | "code" | "text";

export type UploadedAttachment = {
  id: string;
  chatId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  kind: AttachmentKind;
  status: AttachmentStatus;
  storageUrl: string;
  storagePath: string;
  uploadedAt: string;
  extractedText?: string;
  summary?: string;
  pageCount?: number;
  width?: number;
  height?: number;
  language?: string;
  error?: string;
};

export type AttachmentContextChunk = {
  label: string;
  content: string;
};

export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".rtf",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".cpp",
  ".c",
  ".php",
  ".html",
  ".css",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".csv",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
]);

export const ALLOWED_ATTACHMENT_MIME_PREFIXES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "application/xml",
  "text/",
  "image/",
  "audio/",
  "video/",
];

const CODE_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".cpp",
  ".c",
  ".php",
  ".html",
  ".css",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
]);

const DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".rtf"]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".rtf", ".json", ".xml", ".html", ".css", ".yaml", ".yml"]);
const SPREADSHEET_EXTENSIONS = new Set([".csv", ".xlsx"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function getAttachmentExtension(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const dotIndex = trimmed.lastIndexOf(".");
  return dotIndex >= 0 ? trimmed.slice(dotIndex) : "";
}

export function getAttachmentPreviewMode(attachment: {
  kind?: AttachmentKind;
  mimeType?: string;
  name?: string;
}): AttachmentPreviewMode {
  const extension = attachment.name ? getAttachmentExtension(attachment.name) : "";

  if (attachment.kind === "image" || (attachment.mimeType ?? "").startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (attachment.kind === "pdf" || attachment.mimeType === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  if (attachment.kind === "code" || CODE_EXTENSIONS.has(extension)) {
    return "code";
  }

  return "text";
}

export function inferAttachmentKind(input: { name: string; mimeType?: string | null }): AttachmentKind {
  const extension = getAttachmentExtension(input.name);
  const mimeType = (input.mimeType ?? "").toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension) || mimeType.startsWith("image/")) {
    return "image";
  }

  if (extension === ".pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  if (DOCUMENT_EXTENSIONS.has(extension) || mimeType.includes("wordprocessingml.document")) {
    return "document";
  }

  if (SPREADSHEET_EXTENSIONS.has(extension) || mimeType.includes("spreadsheetml.sheet")) {
    return "spreadsheet";
  }

  if (CODE_EXTENSIONS.has(extension)) {
    return "code";
  }

  if (TEXT_EXTENSIONS.has(extension) || mimeType.startsWith("text/")) {
    return extension === ".json" ? "json" : "text";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "other";
}

export function getAttachmentKindLabel(kind: AttachmentKind): string {
  switch (kind) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "document":
      return "Document";
    case "code":
      return "Code";
    case "spreadsheet":
      return "Spreadsheet";
    case "text":
      return "Text";
    case "json":
      return "JSON";
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    default:
      return "File";
  }
}

export function getAttachmentLanguage(name: string): string {
  const extension = getAttachmentExtension(name);

  switch (extension) {
    case ".js":
    case ".jsx":
      return "javascript";
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".py":
      return "python";
    case ".java":
      return "java";
    case ".go":
      return "go";
    case ".rs":
      return "rust";
    case ".cpp":
      return "cpp";
    case ".c":
      return "c";
    case ".php":
      return "php";
    case ".html":
      return "html";
    case ".css":
      return "css";
    case ".json":
      return "json";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".xml":
      return "xml";
    case ".md":
      return "markdown";
    case ".csv":
      return "csv";
    default:
      return "text";
  }
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export function sanitizeAttachmentName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .slice(0, 180) || "attachment";
}

export function summarizeAttachmentText(input: string, maxLength: number = 280): string {
  const trimmed = input.trim().replace(/\r\n/g, "\n");
  if (!trimmed) {
    return "No text extracted.";
  }

  const compact = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatAttachmentLabel(attachment: {
  name: string;
  kind: AttachmentKind;
}): string {
  return `${getAttachmentKindLabel(attachment.kind)}: ${attachment.name}`;
}
