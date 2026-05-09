"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const getSeniorModeStorageKey = (chatId: string) =>
  `forge:chat:${chatId}:force-senior-mode`;

export function useSeniorEngineeringMode(chatId?: string | null) {
  const storageKey = useMemo(
    () => (chatId ? getSeniorModeStorageKey(chatId) : null),
    [chatId],
  );

  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setIsEnabled(false);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      setIsEnabled(stored === "on");
    } catch {
      setIsEnabled(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, isEnabled ? "on" : "off");
    } catch {
      // Ignore storage failures (private mode/quota issues).
    }
  }, [storageKey, isEnabled]);

  const toggle = useCallback(() => {
    setIsEnabled((current) => !current);
  }, []);

  return {
    isEnabled,
    setIsEnabled,
    toggle,
  };
}
