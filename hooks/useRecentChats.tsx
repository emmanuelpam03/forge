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

  // Stream removed: title-updates EventSource disabled by request
  const chatIdsKey = useMemo(() => recentChats.map((c) => c.id).join(","), [recentChats]);

  return { recentChats, setRecentChats } as const;
}
