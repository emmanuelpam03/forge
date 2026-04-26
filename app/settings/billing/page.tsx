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
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-zinc-100">
              Billing
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

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2a23] text-[#10a37f]">
                <CreditCard size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Current plan
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                  Simple, clean billing for the current frontend stage.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#10a37f] bg-[#0f2a23] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-zinc-100">
                    Free
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-zinc-400">
                    Great for trying Forge while the product is still evolving.
                  </p>
                </div>
                <Sparkles size={18} className="text-[#10a37f]" />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
              <p className="text-[13px] uppercase tracking-[0.18em] text-zinc-500">
                Upgrade path
              </p>
              <p className="mt-2 text-[14px] leading-6 text-zinc-200">
                Pro will later unlock more models, deeper memory, and advanced
                tools.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#242424] bg-[#1a1a1a]/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1d1d] text-zinc-300">
                <ReceiptText size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Usage summary
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-zinc-500">
                  A quick snapshot of current activity.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {USAGE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-[#2a2a2a] bg-[#141414] px-4 py-3"
                >
                  <span className="text-[14px] text-zinc-300">
                    {item.label}
                  </span>
                  <span className="text-[14px] font-semibold text-zinc-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
              <div className="flex items-center gap-3">
                <Gauge size={18} className="text-[#10a37f]" />
                <div>
                  <p className="text-[14px] font-medium text-zinc-100">
                    Growth ready
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-zinc-500">
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
