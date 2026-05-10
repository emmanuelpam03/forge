import { useState, useEffect } from "react";

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

export function useSelectedOptions(chatId: string) {
  const [selectedOptions, setSelectedOptions] = useState<OptionId[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `forge:chat:${chatId}:selected-options`;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSelectedOptions(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // Ignore storage errors
    }
    setIsLoaded(true);
  }, [chatId, storageKey]);

  // Save to localStorage when changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedOptions));
    } catch {
      // Ignore storage errors
    }
  }, [selectedOptions, isLoaded, storageKey]);

  const toggleOption = (optionId: OptionId) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    );
  };

  const removeOption = (optionId: OptionId) => {
    setSelectedOptions((prev) => prev.filter((id) => id !== optionId));
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
