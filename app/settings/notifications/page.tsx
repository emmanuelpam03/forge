"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageSquareText,
  Smartphone,
} from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

const NOTIFICATION_CHANNELS = [
  {
    label: "Desktop alerts",
    description: "Get a notification when a response completes.",
    icon: Bell,
    enabled: true,
  },
  {
    label: "Email updates",
    description: "Product updates and workspace activity summaries.",
    icon: Mail,
    enabled: false,
  },
  {
    label: "In-app banners",
    description: "Show quick notices for tasks and tool events.",
    icon: MessageSquareText,
    enabled: true,
  },
  {
    label: "Mobile push",
    description: "Reserved for future mobile clients.",
    icon: Smartphone,
    enabled: false,
  },
];

export default function NotificationsSettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-zinc-100">
              Notifications
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

        <section className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
              Notification channels
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-zinc-500">
              Choose where Forge can send updates.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {NOTIFICATION_CHANNELS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d1d1d] text-zinc-300">
                        <Icon size={16} />
                      </span>
                      <div>
                        <p className="text-[14px] font-medium text-zinc-100">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        item.enabled
                          ? "bg-[#0f2a23] text-[#10a37f]"
                          : "bg-[#1f1f1f] text-zinc-500"
                      }`}
                    >
                      {item.enabled ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
