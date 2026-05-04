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

const statusStyles: Record<string, React.CSSProperties> = {
  pending: {
    background: "rgba(251,191,36,0.08)",
    border: "1px solid rgba(251,191,36,0.2)",
    color: "rgba(251,191,36,0.85)",
  },
  approved: {
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.2)",
    color: "rgba(34,197,94,0.85)",
  },
  rejected: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "rgba(239,68,68,0.8)",
  },
  canceled: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.35)",
  },
};

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
    <div
      className="overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.02)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(251,191,36,0.35) 0%, transparent 60%)",
        }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Meta row */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-semibold uppercase"
                style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)" }}
              >
                Suggested action
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase"
                style={{
                  letterSpacing: "0.08em",
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  color: "rgba(251,191,36,0.85)",
                }}
              >
                {suggestion.taskType}
              </span>
            </div>

            <h3
              className="text-[15px] font-semibold"
              style={{
                letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.9)",
                lineHeight: "1.4",
              }}
            >
              {suggestion.description}
            </h3>

            <p
              className="mt-2 text-[12.5px]"
              style={{ color: "rgba(255,255,255,0.45)", lineHeight: "1.6" }}
            >
              {suggestion.action}
            </p>

            <p
              className="mt-1 text-[11.5px]"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              {formatTaskMeta(suggestion)}
            </p>

            {!projectReady ? (
              <p
                className="mt-2.5 text-[12px]"
                style={{ color: "rgba(251,191,36,0.65)" }}
              >
                Attach this chat to a project before accepting tasks.
              </p>
            ) : null}
          </div>

          {/* Status badge */}
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase"
            style={{ letterSpacing: "0.1em", ...statusStyles[status] }}
          >
            {status}
          </span>
        </div>

        {/* Action buttons */}
        <div
          className="mt-4 flex flex-wrap items-center gap-2 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {status === "approved" ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              }}
            >
              <X size={13} />
              Cancel task
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onReject}
                disabled={isSubmitting || isResolved}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.55)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.2)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(239,68,68,0.85)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
                }}
              >
                <X size={13} />
                Reject
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={isSubmitting || !projectReady || isResolved}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  color: "#1a1208",
                  boxShadow: "0 2px 8px rgba(251,191,36,0.25)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.88";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                <Check size={13} />
                Accept
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}