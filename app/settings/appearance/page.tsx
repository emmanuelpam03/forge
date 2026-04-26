"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp, MoonStar, Sparkles, Type } from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

const APPEARANCE_CARDS = [
  {
    label: "Dark premium",
    description: "The current Forge look with high contrast surfaces.",
    active: true,
  },
  {
    label: "Dense workspace",
    description: "Tighter spacing for people who scan quickly.",
    active: false,
  },
  {
    label: "Balanced reading",
    description: "Slightly more breathing room for long sessions.",
    active: false,
  },
];

export default function AppearanceSettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-zinc-100">
              Appearance
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

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2a23] text-[#10a37f]">
                <MoonStar size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Theme
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                  Keep the visual system dark, focused, and calm.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-zinc-200">Dark premium</span>
                <CircleHelp size={16} className="text-zinc-500" />
              </div>
              <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                This matches the current Forge interface and keeps contrast
                high.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1d] text-zinc-300">
                <Type size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Typography
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                  Current pairing uses Manrope and Space Grotesk.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {APPEARANCE_CARDS.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 ${
                    item.active
                      ? "border-[#10a37f] bg-[#0f2a23]"
                      : "border-[#2a2a2a] bg-[#141414]"
                  }`}
                >
                  <p className="text-[14px] font-medium text-zinc-100">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2a23] text-[#10a37f]">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                Density presets
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                A few quick options for how spacious the interface should feel.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4 text-[14px] text-zinc-100">
              Compact
            </div>
            <div className="rounded-2xl border border-[#10a37f] bg-[#0f2a23] p-4 text-[14px] text-zinc-100">
              Balanced
            </div>
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4 text-[14px] text-zinc-100">
              Spacious
            </div>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
