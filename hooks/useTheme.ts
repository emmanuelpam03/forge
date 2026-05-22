"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function getSystemPreference(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// `getInitialTheme` removed — logic consolidated in useEffect to avoid unused symbol

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      return isValidTheme(stored) ? stored : getSystemPreference();
    } catch {
      return getSystemPreference();
    }
  });

  // Apply theme to DOM when it changes
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setThemeValue = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemeValue(newTheme);
  };

  return {
    theme,
    toggleTheme,
    setTheme: setThemeValue,
  };
}
