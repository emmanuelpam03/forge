"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const getSeniorModeStorageKey = (chatId: string) =>
  `forge:chat:${chatId}:force-senior-mode`;

const GLOBAL_SENIOR_MODE_KEY = "forge:settings:force-senior-mode";

export function useSeniorEngineeringMode(chatId?: string | null) {
  const storageKey = useMemo(
    () => (chatId ? getSeniorModeStorageKey(chatId) : null),
    [chatId],
  );

  const [perChatEnabled, setPerChatEnabled] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(false);

  useEffect(() => {
    try {
      const storedGlobal = window.localStorage.getItem(GLOBAL_SENIOR_MODE_KEY);
      setGlobalEnabled(storedGlobal === "on");
    } catch {
      setGlobalEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!storageKey) {
      setPerChatEnabled(false);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      setPerChatEnabled(stored === "on");
    } catch {
      setPerChatEnabled(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, perChatEnabled ? "on" : "off");
      } catch {
        // ignore
      }
    }
  }, [storageKey, perChatEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GLOBAL_SENIOR_MODE_KEY,
        globalEnabled ? "on" : "off",
      );
    } catch {
      // ignore
    }
  }, [globalEnabled]);

  const togglePerChat = useCallback(() => {
    setPerChatEnabled((v) => !v);
  }, []);

  const toggleGlobal = useCallback(() => {
    setGlobalEnabled((v) => !v);
  }, []);

  const combinedEnabled = globalEnabled || perChatEnabled;

  return {
    isEnabled: combinedEnabled,
    // per-chat controls
    isPerChatEnabled: perChatEnabled,
    setIsPerChatEnabled: setPerChatEnabled,
    toggle: togglePerChat,
    // global controls
    isGlobalEnabled: globalEnabled,
    setIsGlobalEnabled: setGlobalEnabled,
    toggleGlobal,
  };
}
