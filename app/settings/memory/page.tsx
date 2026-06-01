"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Database,
  Eye,
  SearchCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

const MEMORY_ITEMS = [
  "Preferences: concise answers, dark UI, premium feel",
  "Goals: build Forge, organize projects, move faster",
  "Workflows: research, planning, coding, strategy",
];

const MEMORY_OPTIONS = [
  {
    title: "Saved memories",
    value: "3 active",
    description: "Long-term preferences that help Forge stay consistent.",
  },
  {
    title: "Recent updates",
    value: "2 this week",
    description: "Changes made while you were working across chats.",
  },
  {
    title: "Privacy review",
    value: "Enabled",
    description: "Review and delete memories before they influence answers.",
  },
] as const;

export default function MemorySettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Memory
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Keep long-term preferences simple, visible, and easy to trust.
            </p>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[22px] border border-border bg-card/90">
              <div className="flex items-center justify-between gap-6 px-5 py-4">
                <div className="max-w-104">
                  <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                    What Forge remembers
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Keep memory simple, useful, and easy to trust.
                  </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-primary/15 text-primary">
                  <BrainCircuit size={18} />
                </span>
              </div>

              {MEMORY_ITEMS.map((item, index) => (
                <div
                  key={item}
                  className={`px-5 py-4 ${index > 0 ? "border-t border-border" : "border-t border-border"}`}
                >
                  <p className="text-[14px] font-medium text-foreground">
                    {item}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Memory is used to improve consistency and reduce repeated setup.
                  </p>
                </div>
              ))}

              <div className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      Show memory details
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                      Review exactly what is stored before it is used.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary">
                    <Eye size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-card/90 p-5">
              <div className="flex items-center gap-3">
                <SearchCheck size={18} className="text-primary" />
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Retrieval first
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Use memory when it improves answers, not as clutter.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Database size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Memory scope
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Designed to grow with long-term preferences and recurring work.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {MEMORY_OPTIONS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-muted p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[14px] font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground">
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-primary" />
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Trust signals
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Clear rules around what gets saved and how it is used.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-border bg-muted p-4">
              <div className="flex items-center gap-3">
                <Trash2 size={18} className="text-primary" />
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Manage memory
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Delete anything that no longer helps your workflow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
