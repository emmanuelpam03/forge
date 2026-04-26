"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply stored theme or default to dark on mount
    const stored = localStorage.getItem("theme");
    const theme = (stored as "light" | "dark") || "dark";

    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, []);

  return <>{children}</>;
}
