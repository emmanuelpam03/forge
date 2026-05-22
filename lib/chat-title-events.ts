import { getRedisClient } from "@/lib/redis";
import { debug } from "@/lib/logger";

export const CHAT_TITLE_UPDATES_CHANNEL = "chat:title-updates";

export type ChatTitleUpdateEvent = {
  chatId: string;
  title: string;
};

const GENERIC_TITLE_PATTERNS = [
  /^new chat$/i,
  /^untitled/i,
  /^chat$/i,
  /^untitled\s+chat$/i,
  /^new\s+conversation$/i,
  /^chat\s+\d+$/i,
];

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
    // Best effort only — log debug so we have observability for failures
    try {
      debug("redis_publish_failed", {
        channel: CHAT_TITLE_UPDATES_CHANNEL,
        event,
      });
    } catch (logErr) {
      // ignore logging failures
    }
  }
}