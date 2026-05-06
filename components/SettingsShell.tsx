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
  { label: "Overview", href: "/settings", icon: Settings2, exact: true },
  { label: "Account", href: "/settings/account", icon: UserCircle2 },
  { label: "Appearance", href: "/settings/appearance", icon: MoonStar },
  { label: "Memory", href: "/settings/memory", icon: Sparkles },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
];

export default function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="relative h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
      style={{ background: "var(--background)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 60% 10%, rgba(22,163,74,0.04) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl gap-6">
        {/* Sidebar nav */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div
            className="sticky top-4"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--card)",
              padding: "12px",
            }}
          >
            <div className="px-2 pb-3 pt-1">
              <p
                className="text-[10px] font-semibold uppercase"
                style={{
                  letterSpacing: "0.16em",
                  color: "var(--foreground)",
                  opacity: 0.4,
                }}
              >
                Settings
              </p>
              <h2
                className="mt-1 text-[17px] font-semibold"
                style={{
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-manrope), sans-serif",
                }}
              >
                Preferences
              </h2>
            </div>

            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-150"
                    style={
                      isActive
                        ? {
                            background: "rgba(22,163,74,0.08)",
                            border: "1px solid rgba(22,163,74,0.18)",
                            color: "var(--foreground)",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid transparent",
                            color: "var(--foreground)",
                            opacity: 0.5,
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--accent)";
                        (e.currentTarget as HTMLElement).style.opacity = "0.8";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.opacity = "0.5";
                      }
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        size={13}
                        className="shrink-0"
                        style={{
                          color: isActive ? "rgba(22,163,74,0.8)" : "inherit",
                        }}
                      />
                      <span
                        className="truncate text-[12.5px] font-medium"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {item.label}
                      </span>
                    </span>
                    <ChevronRight
                      size={12}
                      style={{
                        color: "var(--foreground)",
                        opacity: 0.2,
                        flexShrink: 0,
                      }}
                    />
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
