"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";

export type ReasoningTimelineProps = {
  steps: string[];
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  maxPreview?: number; // number of recent steps to show when collapsed
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
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5 text-[13px] text-muted-foreground">
      <button
        type="button"
        onClick={() => onExpandedChange?.(!expanded)}
        className="flex w-full items-center justify-between gap-3 text-left text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
      >
        <span>{expanded ? "Hide reasoning" : "View reasoning"}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded ? (
        <ol className="mt-2 space-y-1.5 pl-1">
          {shownSteps.map((step, index) => (
            <li
              key={`${step}-${index}`}
              className="flex items-start gap-2 leading-5 text-foreground/85"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 leading-5 text-foreground/80">{latestStep}</p>
      )}
    </div>
  );
}

export default ReasoningTimeline;
