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
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#111111]">
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
        <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-[18px] border border-[#2d2d2d] bg-[#1e1e1e] p-7">
          {/* Header */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <ForgeLogo className="h-9 w-9 text-[#10a37f]" />

            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-white">
              What do you want to build today?
            </h1>

            <p className="max-w-[290px] text-[12px] leading-relaxed text-zinc-500">
              Forge helps you think, create, research, organize projects, and
              move faster.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-3 gap-2">
            {FEATURE_CARDS.map(({ id, icon: Icon, title, description }) => (
              <button
                key={id}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-[#333] bg-[#272727] p-3 text-left transition-colors duration-150 hover:bg-[#2e2e2e]"
              >
                <Icon size={17} className="text-[#10a37f]" />

                <span className="text-center text-[11px] font-semibold leading-snug text-zinc-300">
                  {title}
                </span>

                <span className="text-center text-[10px] leading-snug text-zinc-500">
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
                className={`border-b-2 px-2.5 py-1 pb-[7px] text-[13px] transition-colors ${
                  activeTab === tab
                    ? "border-[#10a37f] text-[#10a37f]"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2.5 rounded-[14px] border border-[#333] bg-[#272727] px-3 py-2.5 transition-colors duration-150 focus-within:border-zinc-500">
            <ForgeLogo className="h-5 w-5 shrink-0 text-[#10a37f]" />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Forge"
              className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
            />

            <div className="flex shrink-0 items-center gap-1.5">
              <button className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300">
                <Mic size={15} />
              </button>

              <button
                onClick={handleSend}
                className="rounded-lg bg-[#10a37f] p-[6px] text-white transition-colors duration-150 hover:bg-[#0d8f6f]"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-zinc-700">
          Forge can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
