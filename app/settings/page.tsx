"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, Settings2 } from "lucide-react";
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

function ThemeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
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
                Choose between system, light mode, and dark mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ThemeButton
                label="System"
                active={theme === "system"}
                onClick={() => setTheme("system")}
              />
              <ThemeButton
                label="Light"
                active={theme === "light"}
                onClick={() => setTheme("light")}
              />
              <ThemeButton
                label="Dark"
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
              />
            </div>
          </div>
        </section>

      </div>
    </SettingsShell>
  );
}
