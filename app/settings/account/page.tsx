"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Shield, UserCircle2 } from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

const ACCOUNT_DETAILS = [
  { label: "Display name", value: "Forge User" },
  { label: "Email", value: "user@forge.app" },
  { label: "Role", value: "Personal workspace" },
];

export default function AccountSettingsPage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Account
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
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-primary">
              <UserCircle2 size={22} />
            </span>
            <div>
              <h2 className="text-[19px] font-semibold tracking-[-0.03em] text-foreground">
                Profile information
              </h2>
              <p className="mt-1 text-[14px] leading-6 text-muted-foreground">
                Update the basics for your personal Forge workspace.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {ACCOUNT_DETAILS.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-muted p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-[14px] font-medium text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Mail size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Contact
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Email sign-in and password recovery live here later.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-muted p-4 text-[14px] leading-6 text-card-foreground">
              Primary email stays visible for login and workspace updates.
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/90 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Shield size={18} />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                  Security
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Authentication and recovery options.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border bg-muted p-4 text-[14px] text-foreground">
                Password login enabled
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4 text-[14px] text-foreground">
                Future Google sign-in ready
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
