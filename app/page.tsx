"use client";

import { useState } from "react";
import { ArrowRight, Mic, Bookmark, Layers, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback-provider";

function ForgeLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

      const updateResult = await updateChat(chatId, { title });

      if (!updateResult.success) {
        throw new Error(updateResult.error ?? "Failed to update chat title");
      }

      showFeedback({
        type: "success",
        title: "Chat created",
        description: "Opening your new conversation.",
      });

      setInput("");
      router.push(`/c/${chatId}?initialMessage=${encodeURIComponent(message)}`);
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
      {/* Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 40%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-4 px-6">
        {/* Main Card */}
        <div className="flex w-full max-w-110 flex-col gap-5 rounded-2xl border border-border bg-card p-7 shadow-sm">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <ForgeLogo className="h-6 w-6 text-primary" />
            </div>

            <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
              What do you want to build today?
            </h1>

            <p className="max-w-70 text-[13px] leading-[1.65] text-muted-foreground">
              Forge helps you think, create, research, organize projects, and
              move faster.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-2">
            {FEATURE_CARDS.map(({ id, icon: Icon, title, description }) => (
              <button
                key={id}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-left transition-all duration-150 hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background ring-1 ring-border group-hover:ring-primary/30 transition-all">
                  <Icon size={15} className="text-primary" />
                </span>

                <span className="text-center text-[12px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                  {title}
                </span>

                <span className="text-center text-[11px] leading-snug text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3.5 py-3 transition-all duration-150 focus-within:border-primary/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/10">
            <ForgeLogo className="h-4.5 w-4.5 shrink-0 text-primary" />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Forge"
              disabled={isCreatingChat}
              className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60"
            />

            <div className="flex shrink-0 items-center gap-1.5">
              <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Mic size={14} />
              </button>

              <button
                onClick={handleSend}
                disabled={isCreatingChat}
                className={`rounded-lg p-1.5 transition-all duration-150 ${
                  isCreatingChat
                    ? "bg-muted text-muted-foreground"
                    : input.trim()
                      ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCreatingChat ? (
                  <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                ) : (
                  <ArrowRight size={14} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground/60">
          Forge can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
