"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

const USAGE_ITEMS = [
  { label: "Chats this month", value: "128" },
  { label: "Projects", value: "4" },
  { label: "Memory items", value: "12" },
];

export default function BillingSettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Billing
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Review your current plan and usage without leaving the settings area.
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

        <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[22px] border border-border bg-card/90">
              <div className="flex items-center justify-between gap-6 px-6 py-5">
                <div className="max-w-104">
                  <p className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
                    Current plan
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Billing is informational here until the payment flow is connected.
                  </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-primary/15 text-primary">
                  <CreditCard size={18} />
                </span>
              </div>

              <div className="border-t border-border px-6 py-5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary bg-primary/10 px-4 py-3">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Free
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                      The current workspace is using the free plan.
                    </p>
                  </div>
                  <Sparkles size={18} className="text-primary" />
                </div>
              </div>

              <div className="border-t border-border px-6 py-5">
                <p className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                  Billing status
                </p>
                <p className="mt-2 text-[14px] leading-6 text-foreground">
                  No subscription management is wired yet, so this page stays simple.
                </p>
              </div>
            </div>

            <div className="rounded-[22px] border border-border bg-card/90 p-6">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Design principle
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Keep billing readable instead of packing in controls that do not do anything yet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-card/90 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <ReceiptText size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Usage summary
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  A quick snapshot of current activity.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {USAGE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-border bg-muted px-4 py-3"
                >
                  <span className="text-[14px] text-card-foreground">
                    {item.label}
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
