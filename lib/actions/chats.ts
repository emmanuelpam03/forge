"use server";

import prisma from "@/lib/prisma";
import { error as logError } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";

type ChatWithMessages = Prisma.ChatGetPayload<{
  include: { messages: true; attachments: true };
}>;

export async function createChat(projectId?: string) {
  try {
    const chat = await prisma.chat.create({
      data: {
        title: "New Chat",
        projectId: projectId || null,
      },
    });

    revalidatePath("/", "layout");
    return { success: true, chat };
  } catch (error) {
    logError("create_chat_failed", { error });
    return { success: false, error: "Failed to create chat" };
  }
}

export async function updateChat(
  id: string,
  data: {
    title?: string;
    summary?: string;
    isPinned?: boolean;
    isArchived?: boolean;
  },
) {
  try {
    const chat = await prisma.chat.update({
      where: { id },
      data,
    });

    revalidatePath("/", "layout");
    return { success: true, chat };
  } catch (error) {
    logError("update_chat_failed", { id, error });
    return { success: false, error: "Failed to update chat" };
  }
}

export async function deleteChat(id: string) {
  try {
    await prisma.chat.delete({
      where: { id },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logError("delete_chat_failed", { id, error });
    return { success: false, error: "Failed to delete chat" };
  }
}

type RecentChatCursor = {
  id: string;
  lastMessageAt: Date;
};

export async function getRecentChatsPage(options?: {
  limit?: number;
  cursor?: RecentChatCursor;
}) {
  try {
    const limit = options?.limit ?? 20;

    const chats = await prisma.chat.findMany({
      where: {
        isArchived: false,
        projectId: null,
        ...(options?.cursor
          ? {
              OR: [
                {
                  lastMessageAt: {
                    lt: options.cursor.lastMessageAt,
                  },
                },
                {
                  lastMessageAt: options.cursor.lastMessageAt,
                  id: {
                    lt: options.cursor.id,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = chats.length > limit;
    return {
      chats: hasMore ? chats.slice(0, limit) : chats,
      hasMore,
    };
  } catch (error) {
    logError("get_recent_chats_failed", { error });
    return { chats: [], hasMore: false };
  }
}

export async function getChatById(
  id: string,
  options?: { take?: number; skip?: number },
): Promise<ChatWithMessages | null> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: options?.take ?? 1000,
          skip: options?.skip ?? 0,
        },
      },
    });
    return chat as ChatWithMessages | null;
  } catch (error) {
    logError("get_chat_failed", { id, error });
    return null;
  }
}

export async function getRecentChats(limit: number = 5) {
  const { chats } = await getRecentChatsPage({ limit });
  return chats;
}

export async function getProjectChats(projectId: string) {
  try {
    const chats = await prisma.chat.findMany({
      where: {
        projectId,
        isArchived: false,
      },
      orderBy: { lastMessageAt: "desc" },
    });
    return chats;
  } catch (error) {
    logError("get_project_chats_failed", { projectId, error });
    return [];
  }
}

export async function createChatWithMessage(
  messageContent: string,
  projectId?: string,
) {
  try {
    const chat = await prisma.chat.create({
      data: {
        title: "New Chat",
        projectId: projectId || null,
      },
    });

    // Create the first user message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: messageContent,
      },
    });

    // Update chat's lastMessageAt
    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() },
    });

    revalidatePath("/", "layout");
    return { success: true, chatId: chat.id };
  } catch (error) {
    logError("create_chat_with_message_failed", { projectId, error });
    return { success: false, error: "Failed to create chat" };
  }
}
