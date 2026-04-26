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
    <SettingsShell>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
          background:
            "radial-gradient(ellipse 55% 45% at 60% 18%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-zinc-100">
              Memory
            </h1>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[#2f2f2f] bg-[#171717] px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:border-[#3a3a3a] hover:text-white"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2a23] text-[#10a37f]">
                <BrainCircuit size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                  What Forge remembers
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                  Keep memory simple, useful, and easy to trust.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {MEMORY_ITEMS.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-[14px] leading-6 text-zinc-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1d] text-zinc-300">
                <Database size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Memory scope
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                  Designed to grow with long-term preferences and recurring
                  work.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
              <div className="flex items-center gap-3">
                <SearchCheck size={18} className="text-[#10a37f]" />
                <div>
                  <p className="text-[14px] font-medium text-zinc-100">
                    Retrieval first
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                    Use memory when it improves answers, not as clutter.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-[#10a37f]" />
                <div>
                  <p className="text-[14px] font-medium text-zinc-100">
                    Trust signals
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                    Clear rules around what gets saved and how it is used.
                  </p>
    </SettingsShell>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
