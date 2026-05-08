export type ResponseMode =
  | "code"
  | "factual"
  | "reasoning"
  | "creative"
  | "chat";

export type VerbosityLevel = "concise" | "balanced" | "detailed";

export type AudienceLevel = "beginner" | "general" | "expert";

export type TeachingDepth = "minimal" | "standard" | "deep";

export type FormattingProfile =
  | "default"
  | "bullet-heavy"
  | "table-first"
  | "stepwise";

export type PromptBehaviorControls = {
  responseMode: ResponseMode;
  verbosity: VerbosityLevel;
  audience: AudienceLevel;
  teachingDepth: TeachingDepth;
  formatting: FormattingProfile;
};

export const DEFAULT_PROMPT_BEHAVIOR_CONTROLS: PromptBehaviorControls = {
  responseMode: "chat",
  verbosity: "balanced",
  audience: "general",
  teachingDepth: "standard",
  formatting: "default",
};
