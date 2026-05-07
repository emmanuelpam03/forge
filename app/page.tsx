"use client";

import { useState, type CSSProperties } from "react";
import { ArrowUp, Bookmark, Layers, Globe, Mic, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback-provider";

function ForgeLogo({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 41 41"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.99-3.123 10.079 10.079 0 0 0-9.617 6.977 9.967 9.967 0 0 0-6.69 4.839 10.081 10.081 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.99 3.123 10.079 10.079 0 0 0 9.617-6.977 9.967 9.967 0 0 0 6.69-4.839 10.079 10.079 0 0 0-1.24-11.816z" />
    </svg>
  );
}

const FEATURE_CARDS = [
  {
    id: "1",
    icon: Bookmark,
    title: "Saved Prompts",
    description: "Store and reuse your best prompts instantly.",
  },
  {
    id: "2",
    icon: Layers,
    title: "Projects",
    description: "Organize chats into focused workspaces.",
  },
  {
    id: "3",
    icon: Globe,
    title: "Research Ready",
    description: "Get answers, ideas, summaries, and strategy.",
  },
];

export default function HomePage() {
  const { showFeedback } = useFeedback();
  const router = useRouter();

  const hour = new Date().getHours();
  const greetingText =
    hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const [userName] = useState(() => {
    try {
      return localStorage.getItem("userName") ?? "there";
    } catch {
      return "there";
    }
  });

  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const message = input.trim();

    if (!message) {
      showFeedback({
        type: "error",
        title: "Type a message first",
      });
      return;
    }

    try {
      setError("");
      setIsCreatingChat(true);
      const { createChat, updateChat } = await import("@/lib/actions/chats");

      const createResult = await createChat();

      if (!createResult.success || !createResult.chat) {
        throw new Error(createResult.error ?? "Failed to create chat");
      }

      const chatId = createResult.chat.id;
      const title =
        message.length > 60 ? `${message.slice(0, 60)}...` : message;

      showFeedback({
        type: "success",
        title: "Chat created",
        description: "Opening your new conversation.",
      });

      setInput("");
      window.setTimeout(() => {
        router.push(
          `/c/${chatId}?initialMessage=${encodeURIComponent(message)}`,
        );
      }, 0);

      void updateChat(chatId, { title }).catch((error) => {
        console.error("Failed to update chat title:", error);
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Failed to create chat";

      setError(description);
      showFeedback({
        type: "error",
        title: "Error",
        description,
      });
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-background">
      {/* Subtle ambient glow — matches chat page */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 40%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--foreground) 18%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--foreground) 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-5 px-6">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-2 mb-1">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 28%, transparent) 0%, color-mix(in oklab, var(--primary) 10%, transparent) 100%)",
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--primary) 32%, transparent), 0 8px 32px color-mix(in oklab, var(--primary) 16%, transparent)",
            }}
          >
            <ForgeLogo className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Main Card */}
        <div
          className="flex w-full max-w-104 flex-col gap-6"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--card) 96%, transparent) 0%, color-mix(in oklab, var(--card) 90%, transparent) 100%)",
            border:
              "1px solid color-mix(in oklab, var(--border) 80%, transparent)",
            borderRadius: "20px",
            boxShadow:
              "0 1px 0 color-mix(in oklab, var(--card-foreground) 6%, transparent) inset, 0 20px 48px color-mix(in oklab, var(--foreground) 10%, transparent), 0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent)",
            padding: "28px",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1
              className="text-[26px] font-semibold leading-tight text-foreground"
              style={{
                letterSpacing: "-0.04em",
                fontFamily: "var(--font-manrope), sans-serif",
              }}
            >
              {greetingText.toUpperCase() + ", " + userName}
            </h1>

            <p
              className="max-w-68 text-[13px] leading-[1.7]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Think, create, research, and organize — all in one workspace.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-2">
            {FEATURE_CARDS.map(({ id, icon: Icon, title, description }) => (
              <button
                key={id}
                className="group flex flex-col items-center gap-2.5 text-left transition-all duration-200"
                style={{
                  background:
                    "color-mix(in oklab, var(--card) 94%, var(--primary) 6%)",
                  border:
                    "1px solid color-mix(in oklab, var(--border) 78%, transparent)",
                  borderRadius: "14px",
                  padding: "12px 10px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "color-mix(in oklab, var(--primary) 9%, var(--card))";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "color-mix(in oklab, var(--primary) 38%, transparent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "color-mix(in oklab, var(--card) 94%, var(--primary) 6%)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "color-mix(in oklab, var(--border) 78%, transparent)";
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in oklab, var(--primary) 16%, transparent)",
                    border:
                      "1px solid color-mix(in oklab, var(--primary) 28%, transparent)",
                  }}
                >
                  <Icon size={14} className="text-primary" />
                </span>

                <span
                  className="text-center text-[11.5px] font-semibold leading-snug text-foreground"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {title}
                </span>

                <span
                  className="text-center text-[10.5px] leading-snug"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {description}
                </span>
              </button>
            ))}
          </div>

          {/* Placeholder for floating input to render below */}
        </div>

        {/* Footer */}
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          Forge can make mistakes. Verify important information.
        </p>
      </div>

      {/* Floating Input (same as chat page) */}
      <div className="absolute inset-x-0 bottom-6 z-50 pointer-events-none">
        <div className="mx-auto w-full max-w-4xl px-6 pointer-events-auto">
          <div className="rounded-full bg-card/90 border border-border shadow-lg px-4 py-3 backdrop-blur flex items-center gap-3">
            <button className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
              <Plus size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleSend()}
              placeholder="Ask anything"
              disabled={isCreatingChat}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />

            <button className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
              <Mic size={18} />
            </button>

            <div className="flex items-center gap-2">
              {isCreatingChat ? (
                <button
                  className="rounded-full bg-muted/50 p-2 text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  <span
                    className="block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "currentColor" }}
                  />
                </button>
              ) : (
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  className="rounded-full bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowUp size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-3">
            <p>Enter to send.</p>
          </div>
          {error ? (
            <p className="mt-2 text-[11px] text-red-400 px-3">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
