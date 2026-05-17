"use server";

import prisma from "@/lib/prisma";
import { MessageRole } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { error as logError } from "@/lib/logger";

export async function createMessage(
  chatId: string,
  role: MessageRole,
  content: string,
  opts?: { parentId?: string | null; branchId?: string | null },
) {
  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        role,
        content,
        parentId: opts?.parentId ?? null,
        branchId: opts?.branchId ?? undefined,
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
    logError("create_message_failed", { chatId, role, error });
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
    logError("get_messages_failed", { chatId, error });
    return [];
  }
}

export async function getBranchesForParent(parentMessageId: string) {
  try {
    const branches = await prisma.message.findMany({
      where: { parentId: parentMessageId, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });
    return branches;
  } catch (error) {
    logError("get_branches_failed", { parentMessageId, error });
    return [];
  }
}
