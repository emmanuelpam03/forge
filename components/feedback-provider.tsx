"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type FeedbackType = "success" | "error" | "info";

type FeedbackItem = {
  id: string;
  type: FeedbackType;
  title: string;
  description?: string;
};

type FeedbackContextValue = {
  showFeedback: (item: Omit<FeedbackItem, "id">) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function feedbackStyles(type: FeedbackType) {
  if (type === "success") {
    return "border-primary/35 bg-primary/10 text-foreground";
  }

  if (type === "error") {
    return "border-destructive/45 bg-destructive/10 text-foreground";
  }

  return "border-border bg-card text-foreground";
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const showFeedback = useCallback((item: Omit<FeedbackItem, "id">) => {
    const id = createId();
    setItems((prev) => [...prev, { ...item, id }]);

    window.setTimeout(() => {
      setItems((prev) => prev.filter((entry) => entry.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ showFeedback }), [showFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-lg backdrop-blur ${feedbackStyles(item.type)}`}
            role="status"
            aria-live="polite"
          >
            <p className="text-[13px] font-semibold leading-tight">
              {item.title}
            </p>
            {item.description ? (
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback must be used inside FeedbackProvider.");
  }

  return context;
}
