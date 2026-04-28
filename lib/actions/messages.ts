"use server";

import prisma from "@/lib/prisma";
import { MessageRole } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function createMessage(
  chatId: string,
  role: MessageRole,
  content: string,
) {
  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        role,
        content,
      },
    });

    // Update chat's lastMessageAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    revalidatePath(`/c/${chatId}`);
    return { success: true, message };
  } catch (error) {
    console.error("Failed to create message:", error);
    return { success: false, error: "Failed to create message" };
  }
}

export async function getMessagesByChat(chatId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });
    return messages;
  } catch (error) {
    console.error("Failed to get messages:", error);
    return [];
  }
}
