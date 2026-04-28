"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    console.error("Failed to create chat:", error);
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
    console.error("Failed to update chat:", error);
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
    console.error("Failed to delete chat:", error);
    return { success: false, error: "Failed to delete chat" };
  }
}

export async function getChatById(id: string) {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return chat;
  } catch (error) {
    console.error("Failed to get chat:", error);
    return null;
  }
}

export async function getRecentChats(limit: number = 5) {
  try {
    const chats = await prisma.chat.findMany({
      where: { isArchived: false },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });
    return chats;
  } catch (error) {
    console.error("Failed to get recent chats:", error);
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
    console.error("Failed to get project chats:", error);
    return [];
  }
}
