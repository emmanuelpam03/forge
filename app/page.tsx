"use client";

import { useState, type CSSProperties } from "react";
import { ArrowUp, Mic, Bookmark, Layers, Globe } from "lucide-react";
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

  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);

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
      {/* Layered ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(251,191,36,0.045) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 40% 30% at 20% 20%, rgba(251,191,36,0.025) 0%, transparent 60%)",
        }}
      />

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
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
                "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.06) 100%)",
              boxShadow:
                "0 0 0 1px rgba(251,191,36,0.22), 0 8px 32px rgba(251,191,36,0.1)",
            }}
          >
            <ForgeLogo className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        {/* Main Card */}
        <div
          className="flex w-full max-w-[26rem] flex-col gap-6"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.075)",
            borderRadius: "20px",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.06) inset, 0 32px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.4)",
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
              What will you build today?
            </h1>

            <p
              className="max-w-[17rem] text-[13px] leading-[1.7]"
              style={{ color: "rgba(255,255,255,0.38)" }}
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
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "14px",
                  padding: "12px 10px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(251,191,36,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(251,191,36,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.07)";
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.18)",
                  }}
                >
                  <Icon size={14} className="text-amber-400" />
                </span>

                <span
                  className="text-center text-[11.5px] font-semibold leading-snug text-foreground"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {title}
                </span>

                <span
                  className="text-center text-[10.5px] leading-snug"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {description}
                </span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-3 transition-all duration-200 focus-within:ring-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "14px",
              padding: "10px 12px",
              // @ts-ignore
              "--tw-ring-color": "rgba(251,191,36,0.2)",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(251,191,36,0.3)";
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.055)";
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.09)";
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.04)";
              }
            }}
          >
            <ForgeLogo
              className="h-4 w-4 shrink-0"
              style={{ color: "rgba(251,191,36,0.5)" } as React.CSSProperties}
            />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Forge…"
              disabled={isCreatingChat}
              className="flex-1 bg-transparent text-[13.5px] text-foreground outline-none"
              style={{
                color: "rgba(255,255,255,0.88)",
              }}
            />

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.7)";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.3)";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                <Mic size={13} />
              </button>

              <button
                onClick={handleSend}
                disabled={isCreatingChat}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150"
                style={
                  isCreatingChat
                    ? {
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.25)",
                      }
                    : input.trim()
                      ? {
                          background:
                            "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                          color: "#1a1208",
                          boxShadow: "0 2px 8px rgba(251,191,36,0.3)",
                        }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.25)",
                        }
                }
              >
                {isCreatingChat ? (
                  <span
                    className="block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "rgba(255,255,255,0.3)" }}
                  />
                ) : (
                  <ArrowUp size={13} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          Forge can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
