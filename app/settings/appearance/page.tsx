"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp, MoonStar, Sun, Type } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
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
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return null;
  }

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
                  Toggle between light and dark mode.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={toggleTheme}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  theme === "dark"
                    ? "border-[#10a37f] bg-[#0f2a23]"
                    : "border-[#2a2a2a] bg-[#141414] hover:border-[#3a3a3a]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-zinc-200">
                    Dark
                  </span>
                  <MoonStar
                    size={16}
                    className={
                      theme === "dark" ? "text-[#10a37f]" : "text-zinc-500"
                    }
                  />
                </div>
                <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                  Dark, focused, and calm interface.
                </p>
              </button>

              <button
                onClick={toggleTheme}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  theme === "light"
                    ? "border-[#10a37f] bg-[#0f2a23]"
                    : "border-[#2a2a2a] bg-[#141414] hover:border-[#3a3a3a]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-zinc-200">
                    Light
                  </span>
                  <Sun
                    size={16}
                    className={
                      theme === "light" ? "text-[#10a37f]" : "text-zinc-500"
                    }
                  />
                </div>
                <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                  Bright, clean, and clear interface.
                </p>
              </button>
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
      </div>
    </SettingsShell>
  );
}
