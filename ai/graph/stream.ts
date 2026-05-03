import type { TaskSuggestion } from "@/types/tasks";

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; content: string }
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
