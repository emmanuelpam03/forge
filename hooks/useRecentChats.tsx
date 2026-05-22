"use client";

import { useEffect, useMemo, useState } from "react";

export type ChatItemData = {
  id: string;
  title: string;
};

export default function useRecentChats(initialChats: ChatItemData[]) {
  const [recentChats, setRecentChats] = useState<ChatItemData[]>(initialChats);

  useEffect(() => {
    function handleChatCreated(e: CustomEvent) {
      const { id, title } = e.detail;
      setRecentChats((prev) => [{ id, title }, ...prev]);
    }

    function handleChatConfirmed(e: CustomEvent) {
      const { tempId, id, title } = e.detail;
      setRecentChats((prev) => {
        const filtered = prev.filter((c) => c.id !== tempId);
        return [{ id, title }, ...filtered];
      });
    }

    function handleTitleUpdated(e: CustomEvent) {
      const { chatId, title } = e.detail;
      if (!chatId || typeof title !== "string") return;
      setRecentChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    }

    window.addEventListener("chat:created", handleChatCreated as EventListener);
    window.addEventListener("chat:confirmed", handleChatConfirmed as EventListener);
    window.addEventListener("chat:title-updated", handleTitleUpdated as EventListener);

    return () => {
      window.removeEventListener("chat:created", handleChatCreated as EventListener);
      window.removeEventListener("chat:confirmed", handleChatConfirmed as EventListener);
      window.removeEventListener("chat:title-updated", handleTitleUpdated as EventListener);
    };
  }, []);

  const chatIdsKey = useMemo(() => recentChats.map((c) => c.id).join(","), [recentChats]);

  useEffect(() => {
    const baseUrl = "/api/chat/title-updates";
    const url = chatIdsKey ? `${baseUrl}?chatIds=${encodeURIComponent(chatIdsKey)}` : baseUrl;
    const source = new EventSource(url);

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const detail = JSON.parse(event.data) as { chatId?: string; title?: string };
        if (!detail.chatId || !detail.title) return;

        setRecentChats((prev) => prev.map((chat) => (chat.id === detail.chatId ? { ...chat, title: detail.title } : chat)));

        window.dispatchEvent(
          new CustomEvent("chat:title-updated", {
            detail: { chatId: detail.chatId, title: detail.title },
          }),
        );
      } catch {
        // ignore malformed events
      }
    };

    const handleError = () => {
      console.warn("Title updates stream disconnected, will auto-reconnect");
    };

    source.addEventListener("message", handleMessage as EventListener);
    source.addEventListener("error", handleError as EventListener);

    return () => {
      source.removeEventListener("message", handleMessage as EventListener);
      source.removeEventListener("error", handleError as EventListener);
      try {
        source.close();
      } catch {}
    };
  }, [chatIdsKey]);

  return { recentChats, setRecentChats } as const;
}
