export type TaskType = "scheduled" | "conditional" | "one-time";

export type TaskStatus =
  | "pending_approval"
  | "approved"
  | "queued"
  | "running"
  | "completed"
  | "canceled"
  | "rejected"
  | "failed";

export type TaskSuggestion = {
  id: string;
  type: "suggestion";
  action: string;
  description: string;
  taskType: TaskType;
  scheduleSpec?: string | null;
  conditionText?: string | null;
  oneTimeAt?: string | null;
};

export type TaskCreateInput = {
  projectId: string;
  chatId?: string | null;
  sourceMessageId?: string | null;
  action: string;
  description: string;
  type: TaskType;
  scheduleSpec?: string | null;
  conditionText?: string | null;
  oneTimeAt?: string | null;
  status?: TaskStatus;
};
