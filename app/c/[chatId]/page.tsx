import { notFound } from "next/navigation";
import { getChatById } from "@/lib/actions/chats";
import { getBranchesForParent } from "@/lib/actions/messages";
import { inferAttachmentKind, type UploadedAttachment } from "@/lib/attachment-types";
import { ChatClient } from "./ChatClient";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ initialMessage?: string }>;
}) {
  const { chatId } = await params;
  const { initialMessage } = await searchParams;
  const chat = await getChatById(chatId, { take: 1000 });

  if (!chat) {
    notFound();
  }

  const assistantMessages = chat.messages.filter(
    (message) => message.role === "assistant",
  );

  const effectiveAssistantParentIds = new Map<string, string | null>();
  let lastUserMessageId: string | null = null;

  for (const message of chat.messages) {
    if (message.role === "user") {
      lastUserMessageId = message.id;
      continue;
    }

    if (message.role !== "assistant") {
      continue;
    }

    effectiveAssistantParentIds.set(
      message.id,
      message.parentId ?? lastUserMessageId,
    );
  }

  const parentIds = Array.from(
    new Set(
      Array.from(effectiveAssistantParentIds.values()).filter(
        (parentId): parentId is string => !!parentId,
      ),
    ),
  );

  const branchEntries = await Promise.all(
    parentIds.map(
      async (parentId) =>
        [parentId, await getBranchesForParent(parentId)] as const,
    ),
  );
  const branchesByParentId = Object.fromEntries(branchEntries);

  const latestAssistantByParentId = new Map<
    string,
    (typeof assistantMessages)[number]
  >();
  for (const message of assistantMessages) {
    const effectiveParentId = effectiveAssistantParentIds.get(message.id);
    if (!effectiveParentId) {
      continue;
    }

    latestAssistantByParentId.set(effectiveParentId, message);
  }

  type BranchOption = {
    id: string;
    content: string;
    parentId: string | null;
    branchId: string | null;
    createdAt: string;
  };

  type ChatMessage = {
    id: string;
    role: string;
    content: string;
    parentId?: string | null;
    branchId?: string | null;
    branchOptions?: BranchOption[];
    pending?: boolean;
    streaming?: boolean;
    status?: string;
    reasoning?: string;
    reasoningExpanded?: boolean;
    error?: string;
    attachmentBlock?: {
      attachments: UploadedAttachment[];
    };
    imageBlock?: {
      id?: string;
      url?: string;
      thumbnailUrl?: string;
      title?: string;
    };
  };

  function parseAttachment(input: unknown): UploadedAttachment | null {
    if (!input || typeof input !== "object") {
      return null;
    }

    const attachment = input as Record<string, unknown>;
    const name = typeof attachment.name === "string" ? attachment.name : undefined;
    const originalName =
      typeof attachment.originalName === "string"
        ? attachment.originalName
        : name;
    const mimeType =
      typeof attachment.mimeType === "string"
        ? attachment.mimeType
        : "application/octet-stream";
    const storageUrl =
      typeof attachment.storageUrl === "string" ? attachment.storageUrl : "";
const VALID_ATTACHMENT_KINDS = new Set<UploadedAttachment["kind"]>([
  "image",
  "pdf",
  "document",
  "code",
  "spreadsheet",
  "text",
  "json",
  "audio",
  "video",
  "other",
]);

function isValidAttachmentKind(value: unknown): value is UploadedAttachment["kind"] {
  return typeof value === "string" && VALID_ATTACHMENT_KINDS.has(value as UploadedAttachment["kind"]);
}
    const storagePath =
      typeof attachment.storagePath === "string" ? attachment.storagePath : "";

    if (!name || !originalName || !storageUrl || !storagePath) {
      return null;
    }

    return {
      id:
        typeof attachment.id === "string" && attachment.id
          ? attachment.id
          : storagePath,
      chatId: typeof attachment.chatId === "string" ? attachment.chatId : chatId,
      name,
      originalName,
      mimeType,
      sizeBytes:
        typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : 0,
      checksum:
        typeof attachment.checksum === "string" ? attachment.checksum : "",
      kind:
        isValidAttachmentKind(attachment.kind)
          ? attachment.kind
          : inferAttachmentKind({ name, mimeType }),
      status:
        attachment.status === "uploading" ||
        attachment.status === "processing" ||
        attachment.status === "ready" ||
        attachment.status === "failed"
          ? attachment.status
          : "failed",
      storageUrl,
      storagePath,
      uploadedAt:
        typeof attachment.uploadedAt === "string"
          ? attachment.uploadedAt
          : new Date().toISOString(),
      extractedText:
        typeof attachment.extractedText === "string"
          ? attachment.extractedText
          : undefined,
      summary:
        typeof attachment.summary === "string"
          ? attachment.summary
          : undefined,
      pageCount:
        typeof attachment.pageCount === "number"
          ? attachment.pageCount
          : undefined,
      width:
        typeof attachment.width === "number" ? attachment.width : undefined,
      height:
        typeof attachment.height === "number" ? attachment.height : undefined,
      language:
        typeof attachment.language === "string"
          ? attachment.language
          : undefined,
      error:
        typeof attachment.error === "string" ? attachment.error : undefined,
    };
  }

  function extractAttachmentBlock(media: unknown) {
    if (!media || typeof media !== "object") {
      return undefined;
    }

    const maybeMedia = media as Record<string, unknown>;
    const rawAttachments = Array.isArray(maybeMedia.attachments)
      ? maybeMedia.attachments
      : [];
    const attachments = rawAttachments
      .map((attachment) => parseAttachment(attachment))
      .filter((attachment): attachment is UploadedAttachment => attachment !== null);

    if (attachments.length === 0) {
      return undefined;
    }

    return { attachments };
  }

  const initialMessages: ChatMessage[] = [];
  for (const message of chat.messages) {
    if (message.role === "user") {
      initialMessages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        attachmentBlock: extractAttachmentBlock(message.media),
      });
      continue;
    }

    if (message.role !== "assistant") continue;

    const effectiveParentId =
      effectiveAssistantParentIds.get(message.id) ?? message.parentId;

    if (!effectiveParentId) {
      initialMessages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        parentId: message.parentId,
        branchId: message.branchId,
        // include persisted media if present
        imageBlock: extractImageBlock(message.media),
        attachmentBlock: extractAttachmentBlock(message.media),
      });
      continue;
    }

    const latestBranch = latestAssistantByParentId.get(effectiveParentId);
    if (!latestBranch || latestBranch.id !== message.id) {
      continue;
    }

    const branchOptions = branchesByParentId[effectiveParentId] ?? [];
    initialMessages.push({
      id: message.id,
      role: message.role,
      content: message.content,
      parentId: effectiveParentId,
      branchId: message.branchId,
      branchOptions: branchOptions.map((branch) => ({
        id: branch.id,
        content: branch.content,
        parentId: branch.parentId,
        branchId: branch.branchId,
        createdAt: branch.createdAt.toISOString(),
      })),
      imageBlock: extractImageBlock(message.media),
      attachmentBlock: extractAttachmentBlock(message.media),
    });
  }

  function extractImageBlock(media: unknown) {
    if (!media || typeof media !== "object") return undefined;
    const m = media as Record<string, unknown>;
    const id = typeof m.id === "string" ? m.id : undefined;
    const url = typeof m.url === "string" ? m.url : undefined;
    const thumbnailUrl = typeof m.thumbnailUrl === "string" ? m.thumbnailUrl : undefined;
    const title = typeof m.title === "string" ? m.title : undefined;
    if (!id && !url && !thumbnailUrl && !title) return undefined;
    return { id, url, thumbnailUrl, title };
  }

  return (
    <ChatClient
      chatId={chat.id}
      projectId={chat.projectId}
      title={chat.title}
      initialMessage={initialMessage}
      initialMessages={initialMessages}
    />
  );
}
