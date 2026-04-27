"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Database,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

const MEMORY_ITEMS = [
  "Preferences: concise answers, dark UI, premium feel",
  "Goals: build Forge, organize projects, move faster",
  "Workflows: research, planning, coding, strategy",
];

export default function MemorySettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Memory
            </h1>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <BrainCircuit size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  What Forge remembers
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Keep memory simple, useful, and easy to trust.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {MEMORY_ITEMS.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-muted px-4 py-3 text-[14px] leading-6 text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Database size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Memory scope
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Designed to grow with long-term preferences and recurring
                  work.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
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

            <div className="mt-3 rounded-2xl border border-border bg-muted p-4">
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
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
