"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CircleHelp, MoonStar, Sun, Type } from "lucide-react";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Appearance
            </h1>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <MoonStar size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Theme
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Toggle between light and dark mode.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setTheme("dark")}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  theme === "dark"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-foreground">
                    Dark Premium
                  </span>
                  <MoonStar
                    size={16}
                    className={
                      theme === "dark"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                  Dark, focused, and calm interface.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-card border border-border" />
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary" />
                  <div className="text-[11px] text-muted-foreground">
                    Modern dark theme with emerald accent
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTheme("light")}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  theme === "light"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-foreground">
                    Light Clean
                  </span>
                  <Sun
                    size={16}
                    className={
                      theme === "light"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                  Premium light mode with the same emerald accent.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-card border border-border" />
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary" />
                  <div className="text-[11px] text-muted-foreground">
                    Clean light theme with emerald accent
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Type size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Typography
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
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
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <p className="text-[14px] font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
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
