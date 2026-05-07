"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";

export type ReasoningTimelineProps = {
  steps: string[];
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  maxPreview?: number;
};

export function ReasoningTimeline({
  steps,
  expanded = false,
  onExpandedChange,
  maxPreview = 3,
}: ReasoningTimelineProps) {
  const shownSteps = useMemo(() => {
    if (!steps || steps.length === 0) return [] as string[];
    if (expanded) return steps;
    return steps.slice(Math.max(0, steps.length - maxPreview));
  }, [steps, expanded, maxPreview]);

  if (shownSteps.length === 0) return null;

  const latestStep = shownSteps[shownSteps.length - 1];

  return (
    <div
      className="overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        background: "var(--card)",
      }}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => onExpandedChange?.(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
        style={{
          borderBottom: expanded ? "1px solid var(--border)" : "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--accent)";
          (e.currentTarget as HTMLElement).style.opacity = "0.05";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <span className="flex items-center gap-2.5">
          {/* Thinking indicator */}
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.5)",
                  animation: expanded
                    ? "none"
                    : `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </span>
          <span
            className="text-[11.5px] font-semibold"
            style={{
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--foreground)",
              opacity: 0.5,
            }}
          >
            {expanded ? "Hide reasoning" : "View reasoning"}
          </span>
        </span>
        {expanded ? (
          <ChevronUp
            size={13}
            style={{ color: "var(--foreground)", opacity: 0.3 }}
          />
        ) : (
          <ChevronDown
            size={13}
            style={{ color: "var(--foreground)", opacity: 0.3 }}
          />
        )}
      </button>

      {/* Content area */}
      {expanded ? (
        <ol className="space-y-3 px-4 py-3">
          {shownSteps.map((step, index) => (
            <li
              key={`${step}-${index}`}
              className="flex items-start gap-3"
              style={{ lineHeight: "1.6" }}
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "rgba(16,185,129,0.5)" }}
              />
              <span
                className="text-[13px]"
                style={{ color: "var(--foreground)" }}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p
          className="px-4 py-3 text-[13px]"
          style={{
            lineHeight: "1.65",
            color: "var(--foreground)",
            opacity: 0.7,
          }}
        >
          {latestStep}
        </p>
      )}
    </div>
  );
}
