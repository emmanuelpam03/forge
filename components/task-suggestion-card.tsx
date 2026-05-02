"use client";

import { Check, X } from "lucide-react";
import type { TaskSuggestion } from "@/types/tasks";

export type TaskSuggestionCardProps = {
  suggestion: TaskSuggestion;
  projectReady: boolean;
  status?: "pending" | "approved" | "rejected" | "canceled";
  onAccept: () => void;
  onReject: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
};

function formatTaskMeta(suggestion: TaskSuggestion) {
  if (suggestion.taskType === "scheduled") {
    return suggestion.scheduleSpec ?? "Scheduled task";
  }

  if (suggestion.taskType === "conditional") {
    return suggestion.conditionText ?? "Conditional task";
  }

  return suggestion.oneTimeAt
    ? new Date(suggestion.oneTimeAt).toLocaleString()
    : "One-time task";
}

export function TaskSuggestionCard({
  suggestion,
  projectReady,
  status = "pending",
  onAccept,
  onReject,
  onCancel,
  isSubmitting,
}: TaskSuggestionCardProps) {
  const isResolved = status !== "pending";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Suggested action
            </p>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary">
              {suggestion.taskType}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            {suggestion.description}
          </h3>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            Action: {suggestion.action}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground/80">
            {formatTaskMeta(suggestion)}
          </p>
          {!projectReady ? (
            <p className="mt-2 text-[12px] text-amber-400">
              Attach this chat to a project before accepting tasks.
            </p>
          ) : null}
        </div>

        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status === "approved" ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-[13px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={14} />
            Cancel task
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onReject}
              disabled={isSubmitting || isResolved}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-[13px] font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={14} />
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isSubmitting || !projectReady || isResolved}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={14} />
              Accept
            </button>
          </>
        )}
      </div>
    </div>
  );
}
