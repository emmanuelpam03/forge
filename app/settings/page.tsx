"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  ChevronDown,
  MoonStar,
  Settings2,
  Sparkles,
} from "lucide-react";
import * as React from "react";
import SettingsShell from "@/components/SettingsShell";

function RowButton({
  label,
  value,
  helper,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="max-w-104">
        <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
          {label}
        </p>
        {helper ? (
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            {helper}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className={`inline-flex min-w-30 items-center justify-between gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
          accent
            ? "border-border bg-muted text-foreground hover:bg-accent"
            : "border-border bg-muted text-foreground hover:bg-accent"
        }`}
      >
        {icon}
        <span>{value}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  helper,
  checked,
  onToggle,
}: {
  label: string;
  helper: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="max-w-104">
        <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
          {label}
        </p>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
          {helper}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
          checked ? "border-primary/40 bg-primary" : "border-border bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [dictationEnabled, setDictationEnabled] = React.useState(true);
  const [separateVoice, setSeparateVoice] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themeLabel =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              General
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Match the screenshot’s structure, but keep Forge’s own surfaces and controls.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-card-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <Settings2 size={14} />
            Back to chat
          </Link>
        </div>

        <section className="overflow-hidden rounded-[22px] border border-border bg-card/90">
          <div className="flex items-center justify-between gap-6 px-5 py-4">
            <div className="max-w-104">
              <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                Appearance
              </p>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                Choose how Forge looks.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <MoonStar size={14} className="text-primary" />
              {themeLabel}
            </button>
          </div>

          <div className="border-t border-border">
            <RowButton
              label="Contrast"
              helper="Keep the interface calm and readable in both modes."
              value="System"
            />
          </div>

          <div className="border-t border-border">
            <RowButton
              label="Accent color"
              helper="Forge stays green by default to match the brand tone."
              value="Default"
              icon={<span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              accent
            />
          </div>

          <div className="border-t border-border">
            <RowButton
              label="Language"
              helper="Keep prompts and settings in the language you speak most."
              value="Auto-detect"
            />
          </div>

          <div className="border-t border-border">
            <ToggleRow
              label="Enable Dictation"
              helper="Use dictation in the chat composer."
              checked={dictationEnabled}
              onToggle={() => setDictationEnabled((value) => !value)}
            />
          </div>

          <div className="border-t border-border">
            <RowButton
              label="Spoken language"
              helper="For best results, select the language you mainly speak."
              value="Auto-detect"
            />
          </div>

          <div className="border-t border-border">
            <div className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="max-w-104">
                <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                  Voice
                </p>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Pick the voice used for read-aloud responses.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-black px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90 dark:bg-black"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                    ▶
                  </span>
                  Play
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-2 rounded-full border border-border bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Juniper
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border">
            <ToggleRow
              label="Separate Voice"
              helper="Keep Forge Voice in a separate full screen, without real time transcripts and visuals."
              checked={separateVoice}
              onToggle={() => setSeparateVoice((value) => !value)}
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[22px] border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Sparkles size={18} />
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
              <div className="rounded-2xl border border-primary bg-primary/10 p-4">
                <p className="text-[14px] font-medium text-foreground">Manrope</p>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                  Clear, readable, and used across the interface.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-[14px] font-medium text-foreground">Space Grotesk</p>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                  Reserved for headings and stronger hierarchy.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ArrowRight size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  App feel
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Forge keeps the same shell and spacing across settings pages.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-[14px] font-medium text-foreground">
                  Light mode
                </p>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Soft surfaces with warm neutral framing.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-[14px] font-medium text-foreground">
                  Dark mode
                </p>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Higher contrast surfaces with the same structure.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
