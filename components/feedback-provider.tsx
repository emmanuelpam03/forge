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

function feedbackStyles(type: FeedbackType): React.CSSProperties {
  if (type === "success") {
    return {
      background: "var(--card)",
      border: "1px solid rgba(22,163,74,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.22), 0 0 0 1px rgba(22,163,74,0.1)",
    };
  }
  if (type === "error") {
    return {
      background: "var(--card)",
      border: "1px solid rgba(239,68,68,0.35)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.22), 0 0 0 1px rgba(239,68,68,0.1)",
    };
  }
  return {
    background: "var(--card)",
    border: "1px solid var(--border)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
  };
}

function accentColor(type: FeedbackType): string {
  if (type === "success") return "var(--primary-dark)";
  if (type === "error") return "rgba(239,68,68,0.9)";
  return "var(--sidebar-primary)";
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

      <div className="pointer-events-none fixed right-4 top-4 z-120 flex w-[min(92vw,340px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto rounded-2xl px-4 py-3 backdrop-blur-xl"
            style={feedbackStyles(item.type)}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {/* Accent dot */}
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: accentColor(item.type) }}
              />
              <div>
                <p
                  className="text-[13px] font-semibold leading-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  {item.title}
                </p>
                {item.description ? (
                  <p
                    className="mt-1 text-[12px] leading-snug"
                    style={{ color: "var(--foreground)", opacity: 0.6 }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
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
