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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Notifications
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Choose where Forge can send updates and reminders.
            </p>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-card-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="overflow-hidden rounded-[22px] border border-border bg-card/90">
          <div className="px-5 py-4">
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
              Notification channels
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              Choose where Forge can send updates.
            </p>
          </div>

          {NOTIFICATION_CHANNELS.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${index > 0 ? "border-t border-border" : "border-t border-border"}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/15 text-primary">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    item.enabled
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.enabled ? "On" : "Off"}
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </SettingsShell>
  );
}
