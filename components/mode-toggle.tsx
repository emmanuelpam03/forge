"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{
          background: "var(--accent)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          opacity: 0.3,
        }}
        aria-label="Toggle theme"
        disabled
      >
        <Sun size={13} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
      style={{
        background: "var(--accent)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
        opacity: 0.5,
      }}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "0.8";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "0.5";
      }}
    >
      {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}
