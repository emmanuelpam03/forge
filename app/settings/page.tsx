"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Database, MoonStar, X } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

const NAV_ITEMS = [
  { label: "General", active: true, icon: MoonStar },
  { label: "Data controls", active: false, icon: Database },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isLightMode = resolvedTheme === "light";
  const shellClasses = isLightMode
    ? "border-black/10 bg-[#f4f1ea] text-[#111111] shadow-[0_28px_100px_rgba(0,0,0,0.22)]"
    : "border-white/10 bg-[#2a2a2a] text-white shadow-[0_28px_100px_rgba(0,0,0,0.55)]";
  const surfaceClasses = isLightMode ? "bg-white/70" : "bg-white/8";
  const surfaceHoverClasses = isLightMode ? "hover:bg-white/90" : "hover:bg-white/12";
  const mutedTextClasses = isLightMode ? "text-black/60" : "text-white/60";
  const activePillClasses = isLightMode ? "bg-black text-white" : "bg-white text-black";
  const inactivePillClasses = isLightMode
    ? "bg-black/6 text-black/75 hover:bg-black/10"
    : "bg-white/8 text-white/90 hover:bg-white/12";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className={`w-full max-w-[742px] overflow-hidden rounded-[20px] ${shellClasses}`}>
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${surfaceClasses} ${surfaceHoverClasses}`}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>

          <h1 className="text-[18px] font-medium tracking-[-0.02em]">
            General
          </h1>
        </div>

        <div className="grid min-h-[420px] grid-cols-[208px_1fr] border-t border-black/10">
          <aside className="border-r border-black/10 px-2 py-3">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors ${
                      item.active
                        ? isLightMode
                          ? "bg-black/8 text-black"
                          : "bg-white/10 text-white"
                        : isLightMode
                          ? "text-black/70 hover:bg-black/5"
                          : "text-white/85 hover:bg-white/6"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="px-6 py-5">
            <div className="space-y-0 divide-y divide-black/10">
              <div className="flex items-center justify-between gap-6 py-4">
                <div>
                  <p className="text-[16px] font-medium tracking-[-0.02em]">
                    Appearance
                  </p>
                  <p className={`mt-1 text-[13px] ${mutedTextClasses}`}>
                    Choose how Forge looks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      theme === "system" ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    System
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      theme === "light" ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      theme === "dark" ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 py-4">
                <div>
                  <p className="text-[16px] font-medium tracking-[-0.02em]">
                    Language
                  </p>
                </div>

                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${surfaceClasses} ${surfaceHoverClasses}`}
                >
                  Auto-detect
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-6 py-4">
                <div>
                  <p className="text-[16px] font-medium tracking-[-0.02em]">
                    Accessibility
                  </p>
                </div>

                <div className={`text-[13px] ${mutedTextClasses}`}>More controls coming soon</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
