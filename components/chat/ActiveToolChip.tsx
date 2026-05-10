"use client";

import { X } from "lucide-react";
import type { Option } from "@/hooks/useSelectedOptions";

interface ActiveToolChipProps {
  option: Option;
  onRemove: () => void;
}

export function ActiveToolChip({ option, onRemove }: ActiveToolChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[12px] font-medium text-foreground transition-all duration-200 hover:bg-accent/60 hover:border-accent/40 animate-in fade-in zoom-in-95 duration-150"
      title={`Remove ${option.label}`}
    >
      {/* Icon */}
      <span className="text-sm shrink-0">{option.icon}</span>

      {/* Label */}
      <span className="whitespace-nowrap">{option.label}</span>

      {/* Remove X button */}
      <X
        size={14}
        className="ml-0.5 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </button>
  );
}
