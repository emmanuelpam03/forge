import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type OptionId = "search" | "research" | "analysis" | "coding";

export interface Option {
  id: OptionId;
  label: string;
  icon: string;
}

export const OPTIONS: Record<OptionId, Option> = {
  search: { id: "search", label: "Search", icon: "🌐" },
  research: { id: "research", label: "Research", icon: "📚" },
  analysis: { id: "analysis", label: "Analysis", icon: "📊" },
  coding: { id: "coding", label: "Coding", icon: "💻" },
};

type SelectedOptionsStore = {
  value: OptionId[];
  isInitialized: boolean;
  listeners: Set<() => void>;
};

const selectedOptionsStores = new Map<string, SelectedOptionsStore>();

function getSelectedOptionsStore(storageKey: string): SelectedOptionsStore {
  const existingStore = selectedOptionsStores.get(storageKey);

  if (existingStore) {
    return existingStore;
  }

  const newStore: SelectedOptionsStore = {
    value: [],
    isInitialized: false,
    listeners: new Set(),
  };

  selectedOptionsStores.set(storageKey, newStore);
  return newStore;
}

function notifySelectedOptionsStore(storageKey: string) {
  const store = getSelectedOptionsStore(storageKey);
  store.listeners.forEach((listener) => listener());
}

function readSelectedOptionsFromStorage(storageKey: string): OptionId[] {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    const validOptionIds = new Set<OptionId>(
      Object.keys(OPTIONS) as OptionId[],
    );

    return Array.isArray(parsed)
      ? parsed.filter(
          (value): value is OptionId =>
            typeof value === "string" && validOptionIds.has(value as OptionId),
        )
      : [];
  } catch {
    return [];
  }
}

function initializeSelectedOptionsStorage(storageKey: string) {
  const store = getSelectedOptionsStore(storageKey);

  if (store.isInitialized || typeof window === "undefined") {
    return store.value;
  }

  store.value = readSelectedOptionsFromStorage(storageKey);
  store.isInitialized = true;
  return store.value;
}

function writeSelectedOptionsStorage(
  storageKey: string,
  nextSelectedOptions: OptionId[],
) {
  const store = getSelectedOptionsStore(storageKey);
  store.value = nextSelectedOptions;
  store.isInitialized = true;

  try {
    localStorage.setItem(storageKey, JSON.stringify(nextSelectedOptions));
  } catch {
    // Ignore storage errors
  }

  notifySelectedOptionsStore(storageKey);
}

export function useSelectedOptions(chatId: string) {
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `forge:chat:${chatId}:selected-options`;

  const subscribe = useCallback(
    (listener: () => void) => {
      const store = getSelectedOptionsStore(storageKey);
      store.listeners.add(listener);

      return () => {
        store.listeners.delete(listener);
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback(
    () => initializeSelectedOptionsStorage(storageKey),
    [storageKey],
  );

  const selectedOptions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => [],
  );

  const syncFromStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeSelectedOptionsStorage(
      storageKey,
      readSelectedOptionsFromStorage(storageKey),
    );
  }, [storageKey]);

  const persistSelectedOptions = useCallback(
    (nextSelectedOptions: OptionId[]) => {
      writeSelectedOptionsStorage(storageKey, nextSelectedOptions);
    },
    [storageKey],
  );

  // Load from localStorage on mount
  useEffect(() => {
    syncFromStorage();
    setIsLoaded(true);
  }, [chatId, syncFromStorage]);

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key === storageKey) {
        const nextSelectedOptions = readSelectedOptionsFromStorage(storageKey);
        const store = getSelectedOptionsStore(storageKey);

        store.value = nextSelectedOptions;
        store.isInitialized = true;
        notifySelectedOptionsStore(storageKey);
      }
    }

    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [storageKey, syncFromStorage]);

  const toggleOption = (optionId: OptionId) => {
    const nextSelectedOptions = selectedOptions.includes(optionId)
      ? selectedOptions.filter((id) => id !== optionId)
      : [...selectedOptions, optionId];

    persistSelectedOptions(nextSelectedOptions);
  };

  const removeOption = (optionId: OptionId) => {
    const nextSelectedOptions = selectedOptions.filter((id) => id !== optionId);

    persistSelectedOptions(nextSelectedOptions);
  };

  const isSelected = (optionId: OptionId) => selectedOptions.includes(optionId);

  const getSelectedOptionObjects = (): Option[] =>
    selectedOptions.map((id) => OPTIONS[id]).filter(Boolean);

  return {
    selectedOptions,
    toggleOption,
    removeOption,
    isSelected,
    getSelectedOptionObjects,
    isLoaded,
  };
}
