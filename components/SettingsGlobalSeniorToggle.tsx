"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { useSeniorEngineeringMode } from "@/hooks/useSeniorEngineeringMode";

export default function SettingsGlobalSeniorToggle() {
  const { isGlobalEnabled, toggleGlobal } = useSeniorEngineeringMode();

  return (
    <button
      type="button"
      onClick={() => toggleGlobal()}
      role="switch"
      aria-checked={isGlobalEnabled}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none ${
        isGlobalEnabled ? "bg-primary/80" : "bg-border/20"
      }`}
      title={isGlobalEnabled ? "Global SE enabled" : "Enable global SE mode"}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
          isGlobalEnabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
