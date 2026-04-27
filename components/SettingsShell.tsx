"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CreditCard,
  MoonStar,
  Sparkles,
  UserCircle2,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/settings",
    icon: Settings2,
    exact: true,
  },
  {
    label: "Account",
    href: "/settings/account",
    icon: UserCircle2,
  },
  {
    label: "Appearance",
    href: "/settings/appearance",
    icon: MoonStar,
  },
  {
    label: "Memory",
    href: "/settings/memory",
    icon: Sparkles,
  },
  {
    label: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    label: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
  },
];

export default function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative h-full overflow-y-auto bg-background px-4 py-4 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 18%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl gap-5">
        <aside className="hidden w-62.5 shrink-0 lg:block">
          <div className="sticky top-4 rounded-3xl border border-border bg-card/90 p-3">
            <div className="px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Settings
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                Navigation
              </h2>
            </div>

            <nav className="mt-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                const itemClassName = `flex items-center justify-between rounded-2xl border px-3 py-2.5 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
                } ${item.muted ? "opacity-70" : ""}`;

                const itemContent = (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate text-[13px] font-medium tracking-[-0.01em]">
                        {item.label}
                      </span>
                    </span>
                    <ChevronRight
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                  </>
                );

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={itemClassName}
                  >
                    {itemContent}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
