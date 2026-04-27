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
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Notifications
            </h1>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-card-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <section className="rounded-3xl border border-border bg-card/90 p-5">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
              Notification channels
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              Choose where Forge can send updates.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {NOTIFICATION_CHANNELS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border bg-muted p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <Icon size={16} />
                      </span>
                      <div>
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
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
