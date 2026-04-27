"use client";

import { useState } from "react";
import { ArrowRight, Mic, Bookmark, Layers, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

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

const MEDIA_TABS = [
  "All",
  "Text",
  "Image",
  "Code",
  "Research",
  "Analytics",
] as const;

type MediaTab = (typeof MEDIA_TABS)[number];

export default function HomePage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MediaTab>("All");
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    // later replace with DB create + redirect
    const chatId = Date.now().toString();

    router.push(`/chat/${chatId}`);
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

      <div className="relative z-10 flex w-full flex-col items-center gap-5 px-6">
        {/* Main Card */}
        <div className="flex w-full max-w-110 flex-col gap-5 rounded-[18px] border border-border bg-card p-7">
          {/* Header */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <ForgeLogo className="h-9 w-9 text-primary" />

            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
              What do you want to build today?
            </h1>

            <p className="max-w-72.5 text-[14px] leading-6 text-muted-foreground">
              Forge helps you think, create, research, organize projects, and
              move faster.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-3 gap-2">
            {FEATURE_CARDS.map(({ id, icon: Icon, title, description }) => (
              <button
                key={id}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-3 text-left transition-colors duration-150 hover:bg-accent"
              >
                <Icon size={17} className="text-primary" />

                <span className="text-center text-[13px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                  {title}
                </span>

                <span className="text-center text-[12px] leading-snug text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-0.5">
            {MEDIA_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-2.5 py-1 pb-1.75 text-[14px] transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2.5 rounded-[14px] border border-border bg-muted/40 px-3 py-2.5 transition-colors duration-150 focus-within:border-ring">
            <ForgeLogo className="h-5 w-5 shrink-0 text-primary" />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Forge"
              className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />

            <div className="flex shrink-0 items-center gap-1.5">
              <button className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Mic size={15} />
              </button>

              <button
                onClick={handleSend}
                className="rounded-lg bg-primary p-1.5 text-primary-foreground transition-colors duration-150 hover:opacity-90"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground">
          Forge can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
