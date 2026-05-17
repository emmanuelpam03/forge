"use server";

import prisma from "@/lib/prisma";
import { error as logError } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";

type ChatWithMessages = Prisma.ChatGetPayload<{
  include: { messages: true };
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

export async function getChatById(
  id: string,
  options?: { take?: number; skip?: number },
): Promise<ChatWithMessages | null> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
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
  try {
    const chats = await prisma.chat.findMany({
      where: {
        isArchived: false,
        projectId: null,
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });
    return chats;
  } catch (error) {
    logError("get_recent_chats_failed", { error });
    return [];
  }
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
    // Create chat with title derived from first message
    const title =
      messageContent.length > 60
        ? messageContent.substring(0, 60) + "..."
        : messageContent;

    const chat = await prisma.chat.create({
      data: {
        title,
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
