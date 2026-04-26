"use client";

import { ArrowUp, Copy, RotateCcw, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";

type ChatBlock =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "heading";
      value: string;
    }
  | {
      type: "numbered";
      items: string[];
    }
  | {
      type: "list";
      title?: string;
      items: string[];
    }
  | {
      type: "code";
      language: string;
      code: string;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  blocks: ChatBlock[];
};

const STATIC_CHAT_CONTENT: Record<string, ChatMessage[]> = {
  "1": [
    {
      id: "u1",
      role: "user",
      blocks: [
        {
          type: "text",
          value:
            "Help me build a forex growth plan with strict risk management and weekly review.",
        },
      ],
    },
    {
      id: "a1",
      role: "assistant",
      blocks: [
        {
          type: "text",
          value:
            "Great start. Use this core structure to grow without overtrading:",
        },
        {
          type: "list",
          title: "Risk Framework",
          items: [
            "Risk cap: 1% per trade",
            "Daily max loss: 2%",
            "Stop trading after two rule-breaking trades",
            "Trade one pair until execution consistency reaches 80%",
          ],
        },
      ],
    },
    {
      id: "u2",
      role: "user",
      blocks: [
        {
          type: "text",
          value: "Create a weekly journal template I can actually stick to.",
        },
      ],
    },
    {
      id: "a2",
      role: "assistant",
      blocks: [
        {
          type: "list",
          title: "Weekly Journal Template",
          items: [
            "Setup quality (A/B/C)",
            "Rule adherence score (0-10)",
            "Emotional state before and after entries",
            "Process vs outcome reflection",
            "One focus for next week",
          ],
        },
      ],
    },
  ],
  "2": [
    {
      id: "u1",
      role: "user",
      blocks: [
        {
          type: "text",
          value:
            "Give me 3 hero section concepts for Forge that feel premium and conversion focused.",
        },
      ],
    },
    {
      id: "a1",
      role: "assistant",
      blocks: [
        {
          type: "text",
          value:
            "Concept 2: Flow State hero with concise messaging and direct action.",
        },
        {
          type: "code",
          language: "tsx",
          code: `<section className="relative px-8 py-20">
  <h1 className="text-5xl font-semibold tracking-tight text-white">
    Organize your ideas. Execute with AI.
  </h1>
  <p className="mt-4 max-w-xl text-zinc-400">
    Forge turns scattered chats into structured progress.
  </p>
  <button className="mt-8 rounded-xl bg-[#10a37f] px-5 py-3 text-sm font-medium text-white">
    Start Building
  </button>
</section>`,
        },
      ],
    },
  ],
  "3": [
    {
      id: "u1",
      role: "user",
      blocks: [
        {
          type: "text",
          value:
            "Create a high-protein meal prep plan that is affordable and easy to repeat weekly.",
        },
      ],
    },
    {
      id: "a1",
      role: "assistant",
      blocks: [
        {
          type: "text",
          value:
            "Here is a simple weekly structure with cost and protein targets:",
        },
        {
          type: "table",
          headers: ["Meal", "Protein", "Est. Cost"],
          rows: [
            ["Chicken rice bowl", "42g", "$2.90"],
            ["Turkey pasta", "38g", "$3.40"],
            ["Greek yogurt oats", "30g", "$1.80"],
          ],
        },
      ],
    },
  ],
  "4": [
    {
      id: "u1",
      role: "user",
      blocks: [
        {
          type: "text",
          value:
            "Help me launch Forge in 30 days with clear priorities. I want a plan that balances speed and quality.",
        },
      ],
    },
    {
      id: "a1",
      role: "assistant",
      blocks: [
        {
          type: "heading",
          value: "30-Day Launch Plan",
        },
        {
          type: "text",
          value:
            "Goal: ship a stable MVP focused on retention loops, not feature count. Prioritize chat speed, project organization, and reliable navigation.",
        },
        {
          type: "heading",
          value: "Phase 1: Foundation (Days 1-7)",
        },
        {
          type: "numbered",
          items: [
            "Lock IA: sidebar nav, chat-first home, projects and chat detail routes.",
            "Complete frontend interaction layer with local store and deterministic mock data.",
            "Define quality bars: page load target, interaction latency, and visual consistency.",
          ],
        },
        {
          type: "heading",
          value: "Phase 2: Core Experience (Days 8-20)",
        },
        {
          type: "numbered",
          items: [
            "Implement streaming-ready conversation shell (UI states, typing indicators, action controls).",
            "Build project-scoped chat list behavior and search UX skeleton.",
            "Instrument basic analytics events for chat start, project create, and return sessions.",
          ],
        },
        {
          type: "heading",
          value: "Phase 3: Polish + Launch (Days 21-30)",
        },
        {
          type: "numbered",
          items: [
            "Performance sweep: optimize hydration, trim heavy components, verify mobile responsiveness.",
            "Ship onboarding copy and empty states that drive immediate first prompt action.",
            "Run a soft launch with 10-20 users and fix retention blockers before broader release.",
          ],
        },
      ],
    },
  ],
};

const DEFAULT_CHAT: ChatMessage[] = [
  {
    id: "u1",
    role: "user",
    blocks: [
      {
        type: "text",
        value: "I want to map out this idea and execute it faster.",
      },
    ],
  },
  {
    id: "a1",
    role: "assistant",
    blocks: [
      {
        type: "text",
        value:
          "Perfect. Tell me your goal, timeline, and constraints. I will turn it into a clear action plan with milestones and next steps.",
      },
    ],
  },
];

function MessageBlocks({ blocks }: { blocks: ChatBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <p
              key={index}
              className="whitespace-pre-wrap text-sm leading-relaxed"
            >
              {block.value}
            </p>
          );
        }

        if (block.type === "heading") {
          return (
            <h3 key={index} className="text-sm font-semibold text-zinc-100">
              {block.value}
            </h3>
          );
        }

        if (block.type === "numbered") {
          return (
            <ol
              key={index}
              className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-200"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "list") {
          return (
            <div key={index}>
              {block.title && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {block.title}
                </p>
              )}
              <ul className="space-y-1.5 text-sm text-zinc-200">
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${index}-${itemIndex}`}
                    className="flex gap-2 leading-relaxed"
                  >
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-[#2f2f2f]"
            >
              <div className="border-b border-[#2f2f2f] bg-[#171717] px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
                {block.language}
              </div>
              <pre className="overflow-x-auto bg-[#141414] p-3 text-[12px] leading-relaxed text-zinc-300">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        return (
          <div
            key={index}
            className="overflow-x-auto rounded-xl border border-[#2f2f2f]"
          >
            <table className="min-w-full border-collapse text-left text-xs text-zinc-300">
              <thead className="bg-[#171717] text-zinc-400">
                <tr>
                  {block.headers.map((header) => (
                    <th
                      key={header}
                      className="border-b border-[#2f2f2f] px-3 py-2 font-medium"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="odd:bg-[#151515] even:bg-[#1a1a1a]"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className="px-3 py-2"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;
  const messages = STATIC_CHAT_CONTENT[chatId] ?? DEFAULT_CHAT;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 40%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-between border-b border-[#272727] px-6 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">
            Chat
          </p>
          <h1 className="text-lg font-semibold text-white">
            Conversation #{chatId}
          </h1>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-[#2f2f2f] bg-[#1f1f1f] px-2.5 py-1 text-[11px] text-zinc-400">
          <Sparkles size={12} className="text-[#10a37f]" />
          Forge Preview
        </span>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
                  message.role === "user"
                    ? "border-[#1f6b58] bg-[#0f2a23] text-zinc-100"
                    : "border-[#2d2d2d] bg-[#1b1b1b] text-zinc-200"
                }`}
              >
                <MessageBlocks blocks={message.blocks} />

                {message.role === "assistant" && (
                  <div className="mt-3 flex items-center gap-1 text-zinc-500">
                    <button className="rounded-md p-1.5 transition hover:bg-[#2a2a2a] hover:text-zinc-300">
                      <Copy size={13} />
                    </button>
                    <button className="rounded-md p-1.5 transition hover:bg-[#2a2a2a] hover:text-zinc-300">
                      <RotateCcw size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-[#272727] bg-[#131313]/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#333] bg-[#1f1f1f] px-3 py-2.5">
          <div className="flex items-end gap-2">
            <textarea
              placeholder="Message Forge"
              rows={1}
              readOnly
              className="max-h-40 min-h-6 flex-1 resize-none bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
            />
            <button className="rounded-lg bg-[#10a37f] p-2 text-white transition hover:bg-[#0d8f6f]">
              <ArrowUp size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-600">
            Enter to send. Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
