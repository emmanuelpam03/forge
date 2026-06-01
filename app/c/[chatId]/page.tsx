import { notFound } from "next/navigation";
import { getChatById } from "@/lib/actions/chats";
import { isGuestChatId } from "@/lib/guest-chat";
import { getBranchesForParent } from "@/lib/actions/messages";
import type { UploadedAttachment } from "@/lib/attachment-types";
import {
  assignAttachmentsToUserMessages,
  extractAttachmentBlockFromMedia,
  mapRecordToUploadedAttachment,
} from "@/lib/attachment-display";
import type { RetrievedImage } from "@/ai/tools/image-types";
import { ChatClient } from "./ChatClient";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ initialMessage?: string; attachmentIds?: string }>;
}) {
  const { chatId } = await params;
  const { initialMessage, attachmentIds } = await searchParams;

  if (isGuestChatId(chatId)) {
    return (
      <ChatClient
        chatId={chatId}
        projectId={null}
        title="New Chat"
        initialMessage={initialMessage}
        initialMessages={[]}
        pendingInitialAttachments={[]}
      />
    );
  }

  const pendingAttachmentIds =
    attachmentIds
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
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
      images: RetrievedImage[];
      totalFound?: number;
      retrievalTimeMs?: number;
    };
  };

  function parseRetrievedImage(input: unknown): RetrievedImage | null {
    if (!input || typeof input !== "object") {
      return null;
    }

    const image = input as Record<string, unknown>;
    const id = typeof image.id === "string" && image.id ? image.id : undefined;
    const url = typeof image.url === "string" && image.url ? image.url : undefined;
    const thumbnailUrl =
      typeof image.thumbnailUrl === "string" && image.thumbnailUrl
        ? image.thumbnailUrl
        : url;

    if (!id || !url || !thumbnailUrl) {
      return null;
    }

    return {
      id,
      url,
      thumbnailUrl,
      title: typeof image.title === "string" ? image.title : undefined,
      sourcePage: typeof image.sourcePage === "string" ? image.sourcePage : undefined,
      source: typeof image.source === "string" ? image.source : undefined,
      width: typeof image.width === "number" ? image.width : undefined,
      height: typeof image.height === "number" ? image.height : undefined,
      provider: typeof image.provider === "string" ? image.provider : undefined,
      relevanceScore:
        typeof image.relevanceScore === "number" ? image.relevanceScore : undefined,
      safetyScore:
        typeof image.safetyScore === "number" ? image.safetyScore : undefined,
      metadata:
        image.metadata && typeof image.metadata === "object"
          ? (image.metadata as RetrievedImage["metadata"])
          : undefined,
    };
  }

  function extractImageBlock(media: unknown) {
    if (!media || typeof media !== "object") {
      return undefined;
    }

    const maybeMedia = media as Record<string, unknown>;
    const rawImageBlock = maybeMedia.imageBlock;

    if (rawImageBlock && typeof rawImageBlock === "object") {
      const maybeImageBlock = rawImageBlock as Record<string, unknown>;
      const images = Array.isArray(maybeImageBlock.images)
        ? maybeImageBlock.images
            .map((image) => parseRetrievedImage(image))
            .filter((image): image is RetrievedImage => image !== null)
        : [];

      if (images.length > 0) {
        return {
          images,
          totalFound:
            typeof maybeImageBlock.totalFound === "number"
              ? maybeImageBlock.totalFound
              : undefined,
          retrievalTimeMs:
            typeof maybeImageBlock.retrievalTimeMs === "number"
              ? maybeImageBlock.retrievalTimeMs
              : undefined,
        };
      }
    }

    const id = typeof maybeMedia.id === "string" ? maybeMedia.id : undefined;
    const url = typeof maybeMedia.url === "string" ? maybeMedia.url : undefined;
    const thumbnailUrl =
      typeof maybeMedia.thumbnailUrl === "string" ? maybeMedia.thumbnailUrl : url;
    const title = typeof maybeMedia.title === "string" ? maybeMedia.title : undefined;

    if (!id || !url || !thumbnailUrl) {
      return undefined;
    }

    return {
      images: [
        {
          id,
          url,
          thumbnailUrl,
          title,
        },
      ],
    };
  }

  const linkedAttachmentIds = new Set<string>();
  for (const message of chat.messages) {
    const block = extractAttachmentBlockFromMedia(message.media, chatId);
    for (const attachment of block?.attachments ?? []) {
      linkedAttachmentIds.add(attachment.id);
    }
  }

  const userMessagesForAttachments = chat.messages
    .filter((message) => message.role === "user")
    .map((message) => ({ id: message.id, createdAt: message.createdAt }));

  const attachmentsByUserMessageId = assignAttachmentsToUserMessages(
    userMessagesForAttachments,
    chat.attachments
      .filter((attachment) => !linkedAttachmentIds.has(attachment.id))
      .map((attachment) => ({
      id: attachment.id,
      chatId: attachment.chatId,
      name: attachment.name,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      storageUrl: attachment.storageUrl,
      storagePath: attachment.storagePath,
      checksum: attachment.checksum,
      kind: attachment.kind,
      status: attachment.status,
      extractedText: attachment.extractedText,
      summary: attachment.summary,
      pageCount: attachment.pageCount,
      width: attachment.width,
      height: attachment.height,
      language: attachment.language,
      createdAt: attachment.createdAt,
    })),
  );

  function resolveUserAttachmentBlock(
    userMessage: NonNullable<typeof chat>["messages"][number],
  ): ChatMessage["attachmentBlock"] {
    const fromMedia = extractAttachmentBlockFromMedia(userMessage.media, chatId);
    if (fromMedia) {
      return fromMedia;
    }

    const assigned = attachmentsByUserMessageId.get(userMessage.id);
    if (assigned && assigned.length > 0) {
      return { attachments: assigned };
    }

    // Legacy: uploads were persisted on the assistant message media payload.
    const legacyAssistant = latestAssistantByParentId.get(userMessage.id);
    if (legacyAssistant) {
      return extractAttachmentBlockFromMedia(legacyAssistant.media, chatId);
    }

    return undefined;
  }

  const pendingInitialAttachments: UploadedAttachment[] = chat.attachments
    .filter((attachment) => pendingAttachmentIds.includes(attachment.id))
    .map((attachment) =>
      mapRecordToUploadedAttachment({
        id: attachment.id,
        chatId: attachment.chatId,
        name: attachment.name,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        storageUrl: attachment.storageUrl,
        storagePath: attachment.storagePath,
        checksum: attachment.checksum,
        kind: attachment.kind,
        status: attachment.status,
        extractedText: attachment.extractedText,
        summary: attachment.summary,
        pageCount: attachment.pageCount,
        width: attachment.width,
        height: attachment.height,
        language: attachment.language,
        createdAt: attachment.createdAt,
      }),
    );

  const initialMessages: ChatMessage[] = [];
  for (const message of chat.messages) {
    if (message.role === "user") {
      initialMessages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        attachmentBlock: resolveUserAttachmentBlock(message),
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
        attachmentBlock: extractAttachmentBlockFromMedia(message.media, chatId),
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
      attachmentBlock: extractAttachmentBlockFromMedia(message.media, chatId),
    });
  }

  return (
    <ChatClient
      chatId={chat.id}
      projectId={chat.projectId}
      title={chat.title}
      initialMessage={initialMessage}
      initialMessages={initialMessages}
      pendingInitialAttachments={pendingInitialAttachments}
    />
  );
}
