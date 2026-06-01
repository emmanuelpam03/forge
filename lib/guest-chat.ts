export const GUEST_CHAT_ID_PREFIX = "guest-";

export function isGuestChatId(chatId: string): boolean {
  return chatId.startsWith(GUEST_CHAT_ID_PREFIX);
}

export function createGuestChatId(): string {
  return `${GUEST_CHAT_ID_PREFIX}${crypto.randomUUID()}`;
}
