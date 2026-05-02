/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const BATCH_SIZE = 250;

async function backfillMessageBranches() {
  console.log("\n🌿 Backfilling message branch metadata\n");

  const chats = (await prisma.chat.findMany({
    select: {
      id: true,
      messages: {
        select: {
          id: true,
          role: true,
          parentId: true,
          branchId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })) as any;

  let updatedMessages = 0;

  for (const chat of chats) {
    let lastUserMessageId: string | null = null;
    const updates: Array<{
      id: string;
      parentId?: string | null;
      branchId?: string;
    }> = [];

    for (const message of chat.messages) {
      if (message.role === "user") {
        lastUserMessageId = message.id;

        if (!message.branchId) {
          updates.push({ id: message.id, branchId: randomUUID() });
        }

        continue;
      }

      if (message.role !== "assistant") {
        continue;
      }

      const nextUpdate: {
        id: string;
        parentId?: string | null;
        branchId?: string;
      } = { id: message.id };

      if (!message.branchId) {
        nextUpdate.branchId = randomUUID();
      }

      if (!message.parentId && lastUserMessageId) {
        nextUpdate.parentId = lastUserMessageId;
      }

      if (nextUpdate.branchId || nextUpdate.parentId !== undefined) {
        updates.push(nextUpdate);
      }
    }

    for (let index = 0; index < updates.length; index += BATCH_SIZE) {
      const batch = updates.slice(index, index + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((update) =>
          prisma.message.update({
            where: { id: update.id },
            data: {
              ...(update.parentId !== undefined
                ? { parentId: update.parentId }
                : {}),
              ...(update.branchId ? { branchId: update.branchId } : {}),
            },
          }),
        ),
      );

      updatedMessages += batch.length;
    }
  }

  console.log(`\n✅ Backfill complete. Updated ${updatedMessages} messages.`);
}

backfillMessageBranches()
  .catch((error) => {
    console.error("\n❌ Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
