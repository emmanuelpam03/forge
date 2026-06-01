"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CreditCard,
  MoonStar,
  Sparkles,
  UserCircle2,
  Settings2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "General", href: "/settings", icon: Settings2, exact: true },
  { label: "Account", href: "/settings/account", icon: UserCircle2 },
  { label: "Appearance", href: "/settings/appearance", icon: MoonStar },
  { label: "Memory", href: "/settings/memory", icon: Sparkles },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
];

export default function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDarkMode = resolvedTheme !== "light";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6"
      style={{
        background: isDarkMode
          ? "rgba(0, 0, 0, 0.78)"
          : "rgba(24, 24, 24, 0.56)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            isDarkMode
              ? "radial-gradient(ellipse 55% 35% at 60% 10%, rgba(22,163,74,0.06) 0%, transparent 65%)"
              : "radial-gradient(ellipse 55% 35% at 60% 10%, rgba(22,163,74,0.04) 0%, transparent 65%)",
        }}
      />

      <div
        className="relative z-10 flex h-[min(760px,calc(100vh-3rem))] w-full max-w-230 overflow-hidden rounded-[24px] border border-border bg-card text-foreground shadow-[0_24px_100px_rgba(0,0,0,0.45)]"
        style={{ background: "var(--card)" }}
      >
        <aside className="hidden w-62.5 shrink-0 border-r border-border/80 bg-muted/40 p-3 lg:block">
          <div
            className="h-full rounded-[18px] border border-border/70 bg-background/50 p-3"
            style={{
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="px-2 pb-3 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                Settings
              </p>
              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-foreground">
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
                    className="flex items-center justify-between rounded-2xl px-3 py-2.5 transition-all duration-150"
                    style={
                      isActive
                        ? {
                            background: "rgba(22,163,74,0.1)",
                            border: "1px solid rgba(22,163,74,0.18)",
                            color: "var(--foreground)",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid transparent",
                            color: "var(--foreground)",
                            opacity: 0.62,
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--accent)";
                        (e.currentTarget as HTMLElement).style.opacity = "0.86";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.opacity = "0.62";
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
