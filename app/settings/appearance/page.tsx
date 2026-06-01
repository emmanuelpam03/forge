"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, MoonStar, Sun, Type } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Appearance
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Choose the visual tone, density, and typography that fits your workflow.
            </p>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-[22px] border border-border bg-card/90">
            <div className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="max-w-104">
                <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                  Theme
                </p>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Toggle between light and dark mode.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    theme === "system"
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  System
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    theme === "light"
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    theme === "dark"
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between gap-6">
                <div className="max-w-104">
                  <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                    Contrast
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Keep the interface calm and readable in both modes.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-accent"
                >
                  System
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between gap-6">
                <div className="max-w-104">
                  <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                    Accent color
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Forge stays green by default to match the brand tone.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-accent"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  Default
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[22px] border border-border bg-card/90 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
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

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {APPEARANCE_CARDS.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border p-4 ${
                      item.active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted"
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

            <div className="rounded-[22px] border border-border bg-card/90 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <MoonStar size={18} />
                </span>
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                    Theme preview
                  </h2>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Light and dark variants share the same layout and spacing.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <p className="text-[14px] font-medium text-foreground">
                    Dark premium
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    High contrast surfaces with the emerald accent.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <p className="text-[14px] font-medium text-foreground">
                    Light clean
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Softer surfaces for bright environments.
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
