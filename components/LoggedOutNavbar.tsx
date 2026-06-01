"use client";

import Link from "next/link";
import { ChevronDown, PanelLeft } from "lucide-react";
import { useAuth } from "./auth-provider";
import ForgeLogo from "./ForgeLogo";

export default function LoggedOutNavbar() {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={15} />
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full px-2 py-1.5 text-left transition-colors hover:bg-accent"
            aria-label="Workspace menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card">
              <ForgeLogo className="h-4 w-4 text-sidebar-foreground" />
            </span>
            <span className="min-w-0 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              Forge
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-border bg-card px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Sign up for free
          </Link>
        </div>
      </div>
    </header>
  );
}