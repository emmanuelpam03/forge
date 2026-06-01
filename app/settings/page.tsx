"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CreditCard,
  MoonStar,
  Sparkles,
  UserCircle2,
  Settings2,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";

const SETTINGS_SECTIONS = [
  {
    title: "Account",
    description: "Profile, email, and workspace basics.",
    href: "/settings/account",
    icon: UserCircle2,
  },
  {
    title: "Appearance",
    description: "Theme, contrast, and typography preferences.",
    href: "/settings/appearance",
    icon: MoonStar,
  },
  {
    title: "Memory",
    description: "What Forge remembers across sessions.",
    href: "/settings/memory",
    icon: Sparkles,
  },
  {
    title: "Billing",
    description: "Plan status and usage details.",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Notifications",
    description: "Desktop, email, and in-app updates.",
    href: "/settings/notifications",
    icon: Bell,
  },
] as const;

export default function SettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Preferences
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Keep the app aligned with your workflow. The left rail mirrors the
              same structure used across the rest of Forge.
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

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[22px] border border-border bg-card/90">
            {SETTINGS_SECTIONS.map((section, index) => {
              const Icon = section.icon;

              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/15 text-primary">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-medium tracking-[-0.02em] text-foreground">
                        {section.title}
                      </h2>
                      <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-border bg-card/90 p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Quick access
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/settings/appearance"
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      Theme and contrast
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                      Tune the visual style of the workspace.
                    </p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>

                <Link
                  href="/settings/billing"
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      Billing and usage
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                      Review plan status and current usage.
                    </p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-card/90 p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                App consistency
              </p>
              <p className="mt-4 text-[14px] leading-6 text-foreground">
                Forge settings now follow the same shell, spacing, and card language as the rest of the app.
              </p>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                The pages stay readable and aligned without cloning the reference UI wholesale.
              </p>
            </div>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
