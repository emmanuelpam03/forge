"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Eye,
  Globe,
  Lock,
  MoonStar,
  PanelLeft,
  Shield,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import SettingsShell from "../../components/SettingsShell";

const SETTINGS_SECTIONS = [
  {
    title: "Account",
    description: "Profile, email, and personal details.",
    href: "/settings/account",
    icon: UserCircle2,
  },
  {
    title: "Appearance",
    description: "Theme, density, and typography preferences.",
    href: "/settings/appearance",
    icon: MoonStar,
  },
  {
    title: "Memory",
    description: "What Forge remembers and how it uses context.",
    href: "/settings/memory",
    icon: Sparkles,
  },
  {
    title: "Billing",
    description: "Plan, usage, and subscription details.",
    href: "/settings/billing",
    icon: Shield,
  },
];

const QUICK_TOGGLES = [
  {
    label: "Desktop notifications",
    description: "Get notified when a response finishes.",
  },
  {
    label: "Compact sidebar",
    description: "Tighter navigation spacing for faster scanning.",
  },
  {
    label: "Search suggestions",
    description: "Show recent chats and projects while searching.",
  },
];

export default function SettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Workspace
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-zinc-100">
              Settings
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-zinc-500">
              Keep Forge tuned to how you work. Adjust the experience, manage
              your profile, and control how memory behaves.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#2f2f2f] bg-[#171717] px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:border-[#3a3a3a] hover:text-white"
          >
            Back to chat
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Quick Access
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Core settings
                </h2>
              </div>
              <PanelLeft className="text-[#10a37f]" size={20} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;

                return (
                  <Link
                    key={section.title}
                    href={section.href}
                    className="group rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4 transition hover:border-[#333] hover:bg-[#171717]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2f2f2f] bg-[#1d1d1d] text-[#10a37f]">
                          <Icon size={18} />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-100">
                            {section.title}
                          </h3>
                          <p className="mt-1 max-w-sm text-[13px] leading-6 text-zinc-500">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="mt-1 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Status
              </p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Your workspace
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2a23] text-[#10a37f]">
                    <Eye size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-zinc-100">
                      Visibility
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                      Private workspace, visible only to you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1d] text-zinc-300">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-zinc-100">
                      Language
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                      English, with concise AI responses.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1d] text-zinc-300">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-zinc-100">
                      Notifications
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                      Ready for future push and email preferences.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Preferences
              </p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Experience controls
              </h2>
            </div>
            <Lock className="text-zinc-500" size={18} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {QUICK_TOGGLES.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-zinc-100">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex h-7 w-12 items-center rounded-full bg-[#252525] p-1">
                    <div className="h-5 w-5 rounded-full bg-[#10a37f] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
