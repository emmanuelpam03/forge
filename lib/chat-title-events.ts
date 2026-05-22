import { getRedisClient } from "@/lib/redis";

export const CHAT_TITLE_UPDATES_CHANNEL = "chat:title-updates";

export type ChatTitleUpdateEvent = {
  chatId: string;
  title: string;
};

const GENERIC_TITLE_PATTERNS = [/^new chat$/i, /^untitled/i, /^chat$/i];

export function isGenericChatTitle(title: string): boolean {
  const normalized = title.trim();
  if (!normalized) {
    return true;
  }

  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export async function publishChatTitleUpdate(event: ChatTitleUpdateEvent) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.publish(CHAT_TITLE_UPDATES_CHANNEL, JSON.stringify(event));
  } catch {
    // Best effort only.
  }
}