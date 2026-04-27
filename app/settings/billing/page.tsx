"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Gauge,
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
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Billing
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

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <CreditCard size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Current plan
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Simple, clean billing for the current frontend stage.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-primary bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">
                    Free
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Great for trying Forge while the product is still evolving.
                  </p>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
              <p className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                Upgrade path
              </p>
              <p className="mt-2 text-[14px] leading-6 text-foreground">
                Pro will later unlock more models, deeper memory, and advanced
                tools.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/90 p-5">
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

            <div className="mt-4 space-y-3">
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

            <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
              <div className="flex items-center gap-3">
                <Gauge size={18} className="text-primary" />
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    Growth ready
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    Billing can scale later without changing the current design.
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
