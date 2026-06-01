"use client";

import Link from "next/link";
import { ArrowLeft, UserCircle2 } from "lucide-react";
import SettingsShell from "../../../components/SettingsShell";

export default function ProfilePage() {
  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Profile
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              A simple profile summary for the current workspace.
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

        <section className="rounded-[22px] border border-border bg-card/90 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-primary/15 text-primary">
              <UserCircle2 size={22} />
            </span>
            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                Profile overview
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                This route exists for profile-specific settings or future identity controls.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-muted p-4">
            <p className="text-[14px] font-medium text-foreground">
              Keep profile details inside the same shared settings shell.
            </p>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              If this page grows later, it should follow the same row-based pattern as the other settings pages.
            </p>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
