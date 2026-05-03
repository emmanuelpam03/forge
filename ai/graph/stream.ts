import type { TaskSuggestion } from "@/types/tasks";

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; content: string }
  | { type: "first_token"; ttftMs?: number }
  | {
      type: "suggestion";
      suggestion: {
        id: string;
        type: "suggestion";
        action: string;
        description: string;
        taskType: "scheduled" | "conditional" | "one-time";
        scheduleSpec?: string | null;
        conditionText?: string | null;
        oneTimeAt?: string | null;
      };
    }
  | {
      type: "suggestions";
      suggestions: Array<{
        id: string;
        type: "suggestion";
        action: string;
        description: string;
        taskType: "scheduled" | "conditional" | "one-time";
        scheduleSpec?: string | null;
        conditionText?: string | null;
        oneTimeAt?: string | null;
      }>;
    }
  | {
      type: "placeholder";
      messageId: string;
      branchId: string;
      parentId: string | null;
    }
  | {
      type: "branches";
      parentId: string | null;
      branches: Array<{
        id: string;
        content: string;
        parentId: string | null;
        branchId: string | null;
        createdAt: string;
      }>;
    }
  | {
      type: "done";
      messageId?: string;
      response?: string;
      suggestions?: TaskSuggestion[];
    };
