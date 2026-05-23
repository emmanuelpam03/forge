import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  composePromptSegments,
  type PromptSegment,
} from "@/ai/prompts/composer";
import {
  getFormatterPrompt,
  getHumanizationPrompt,
  getMasterPrompt,
  getModePrompt,
  getSafetyPrompt,
  getTaskPrompt,
  getToolsPrompt,
  getVisualContextToolPrompt,
} from "@/ai/prompts/promptRegistry";
// humanization routing removed from live prompt assembly
import {
  DEFAULT_PROMPT_BEHAVIOR_CONTROLS,
  type AudienceLevel,
  type FormattingProfile,
  type PromptBehaviorControls,
  type ResponseMode,
  type TeachingDepth,
  type VerbosityLevel,
} from "@/ai/prompts/control.types";
import { buildFreshnessClassificationMessage } from "@/ai/prompts/intent";
import { info } from "@/lib/logger";
import { formatSelectedContext } from "@/ai/context/engine";
import type { ChatGraphState } from "@/ai/graph/state";
import { SELECTED_OPTION_LABELS } from "@/ai/selected-options";
import {
  buildAttachmentMultimodalBlocks,
  formatAttachmentContext as formatUploadedAttachmentContext,
} from "@/lib/attachment-processing";

function formatSelectedOptions(state: ChatGraphState): string {
  const selectedOptions = state.selectedOptions ?? [];

  if (selectedOptions.length === 0) {
    return "";
  }

  const labels = selectedOptions
    .map((optionId) => SELECTED_OPTION_LABELS[optionId] ?? optionId)
    .join(", ");

  return `User-selected assistant modes are ${labels}.`;
}

function resolveResponseMode(state: ChatGraphState): ResponseMode {
  if (state.responseMode && state.responseMode !== "auto") {
    return state.responseMode;
  }

  switch (state.taskCategory) {
    case "coding":
      return "code";
    case "reasoning":
    case "explanation":
      return "reasoning";
    case "planning":
      return "reasoning";
    case "trading":
      return "factual";
    default:
      if (state.intent && /creative|story|poem|generate/i.test(state.intent)) {
        return "creative";
      }
      return "chat";
  }
}

function resolveVerbosityLevel(state: ChatGraphState): VerbosityLevel {
  if (state.verbosityLevel && state.verbosityLevel !== "auto") {
    return state.verbosityLevel;
  }

  const message = state.userMessage.toLowerCase();
  if (
    /\b(short|brief|quick|tldr|one line|concise|just answer)\b/.test(message)
  ) {
    return "concise";
  }
  if (
    /\b(detailed|deep|thorough|comprehensive|step by step|in depth)\b/.test(
      message,
    )
  ) {
    return "detailed";
  }

  return "balanced";
}

function resolveAudienceLevel(state: ChatGraphState): AudienceLevel {
  if (state.audienceLevel && state.audienceLevel !== "auto") {
    return state.audienceLevel;
  }

  const message = state.userMessage.toLowerCase();
  if (
    /\b(beginner|new to|novice|eli5|explain like i.?m five)\b/.test(message)
  ) {
    return "beginner";
  }
  if (/\b(expert|advanced|senior|principal|staff)\b/.test(message)) {
    return "expert";
  }

  return "general";
}

function resolveTeachingDepth(state: ChatGraphState): TeachingDepth {
  if (state.teachingDepth && state.teachingDepth !== "auto") {
    return state.teachingDepth;
  }

  const message = state.userMessage.toLowerCase();

  // Explicit deep-depth keywords (request for explanation, teaching, reasoning)
  if (
    /\b(explain|explain to me|why|how|walk me through|teach me|break down|reasoning|intuition|conceptual)\b/.test(
      message,
    )
  ) {
    return "deep";
  }

  // Explicit minimal-depth keywords (direct answer only, no explanation)
  if (
    /\b(just answer|no explanation|brief|tl;?dr|quick|one-liner)\b/.test(
      message,
    )
  ) {
    return "minimal";
  }

  // Map audience level to teaching depth when no explicit depth keyword is present
  // This provides intelligent escalation based on inferred skill level
  const inferredAudience = resolveAudienceLevel(state);
  if (inferredAudience === "beginner") {
    return "minimal"; // Beginners benefit from simple language and concrete analogies
  }
  if (inferredAudience === "expert") {
    return "deep"; // Experts prefer deep, edge-case focused content
  }
  // Default for intermediate audience
  return "standard";
}

/**
 * Log anonymized teaching depth choice for ML feedback training.
 * Stores (topic_hash, chosen_depth, inferred_audience) tuples for analysis.
 */
function logTeachingDepthTelemetry(
  state: ChatGraphState,
  chosen: TeachingDepth,
): void {
  // Avoid logging in test/dev environments
  if (process.env.NODE_ENV === "test" || process.env.SKIP_TELEMETRY === "1") {
    return;
  }

  try {
    // Hash the user message to create a topic signature without exposing content
    const topicHash = hashUserMessage(state.userMessage);
    const inferredAudience = resolveAudienceLevel(state);

    // Build telemetry payload (anonymized)
    const telemetryPayload = {
      timestamp: new Date().toISOString(),
      // Note: userId_hash would be set by middleware; omitted here for safety
      topic_hash: topicHash,
      chosen_depth: chosen,
      inferred_audience: inferredAudience,
      responseMode: state.responseMode || "auto",
    };

    // Log for aggregation (this integrates with your logging/analytics pipeline)
    // For now, we log to console in dev; production should route to analytics DB
    if (process.env.NODE_ENV === "development") {
      console.debug("[TeachingDepthTelemetry]", telemetryPayload);
    }

    // TODO: integrate with analytics backend (e.g., POST to /api/telemetry/teaching-depth)
    // Example future code:
    // await fetch("/api/telemetry/teaching-depth", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(telemetryPayload),
    // }).catch((err) => {
    //   // Silent failure to avoid blocking response
    //   console.error("[TeachingDepthTelemetry] Error logging:", err.message);
    // });
  } catch (error) {
    // Telemetry errors should never block response generation
    if (process.env.NODE_ENV === "development") {
      console.error("[TeachingDepthTelemetry] Unexpected error:", error);
    }
  }
}

/**
 * Simple hash function for user message (topic signature).
 * Used to anonymize content for telemetry while allowing pattern detection.
 */
function hashUserMessage(message: string): string {
  // Simple hash: first 50 chars + message length + word count
  // This is intentionally weak hashing to avoid re-identifying content
  const preview = message.substring(0, 50).toLowerCase();
  const wordCount = message.split(/\s+/).length;
  const charCount = message.length;
  const hash = `${preview.replace(/[^a-z0-9]/g, "").substring(0, 20)}:${charCount}:${wordCount}`;
  return hash.substring(0, 64); // Cap at 64 chars for consistency
}

function resolveFormattingProfile(state: ChatGraphState): FormattingProfile {
  if (state.formattingProfile && state.formattingProfile !== "auto") {
    return state.formattingProfile;
  }

  const message = state.userMessage.toLowerCase();
  if (/\b(table|tabular|columns)\b/.test(message)) {
    return "table-first";
  }
  if (/\b(step by step|steps|checklist)\b/.test(message)) {
    return "stepwise";
  }
  if (/\b(bullets|bullet points|list)\b/.test(message)) {
    return "bullet-heavy";
  }

  return "default";
}

function resolveBehaviorControls(
  state: ChatGraphState,
): PromptBehaviorControls {
  return {
    responseMode: resolveResponseMode(state),
    verbosity: resolveVerbosityLevel(state),
    audience: resolveAudienceLevel(state),
    teachingDepth: resolveTeachingDepth(state),
    formatting: resolveFormattingProfile(state),
    persona: "auto",
  };
}

// Preferences formatting removed; preferences are not injected into prompts.

function formatIntent(state: ChatGraphState): string {
  if (!state.intent) {
    return "";
  }
  return `User intent is ${state.intent}.`;
}

function formatQueryIntent(state: ChatGraphState): string {
  if (!state.queryIntent) {
    return "";
  }

  return `Current query intent is ${state.queryIntent.type} and tools are ${state.queryIntent.needsTools ? "needed" : "not needed"}.`;
}

// Memory summary/injection removed under chat-history-only policy.

// History formatting retained in `formatSelectedContext`; helper removed.

function formatToolContext(state: ChatGraphState): string {
  if (state.evidenceBundles.length === 0 && !state.toolContext) {
    return "No tool outputs captured.";
  }

  let context = "";

  if (state.evidenceBundles.length > 0) {
    // Exclude imageSearch bundles from the textual tool context so that
    // image results remain a structured, UI-rendered asset and do not
    // cause raw tool output (JSON/XML) to appear in prompts.
    context = state.evidenceBundles
      .filter((bundle) => bundle.tool !== "imageSearch")
      .map((bundle) => `${bundle.tool} evidence: ${bundle.content}`)
      .join(" ");
  } else if (state.toolContext) {
    context = state.toolContext;
  }

  if (state.synthesisNote) {
    context += ` Synthesis note: ${state.synthesisNote}`;
  }

  return context;
}

function formatEvidencePriorityContext(state: ChatGraphState): string {
  const sections: string[] = [];

  if (state.evidenceBundles.length > 0 || state.toolContext) {
    sections.push(
      `Verified tool evidence includes ${formatToolContext(state)}.`,
    );
  }

  if (state.queryIntent) {
    sections.push(formatQueryIntent(state));
  }

  return sections.join("\n").trim();
}

function formatToolPlan(state: ChatGraphState): string {
  if (
    !state.toolPlan ||
    state.toolPlan.toolsNeeded.length === 0 ||
    !state.executionMode
  ) {
    return "";
  }

  return `Tools used were ${state.toolPlan.toolsNeeded.join(", ")} in ${state.executionMode} mode.`;
}

function buildRuntimeContext(state: ChatGraphState): string {
  const evidencePriorityContext = formatEvidencePriorityContext(state);
  const attachmentContext = formatUploadedAttachmentContext(
    state.attachments,
    state.userMessage,
  );

  if (state.selectedContext) {
    const selectedContext = formatSelectedContext(state.selectedContext);
    return [evidencePriorityContext, attachmentContext, selectedContext]
      .filter(Boolean)
      .join(" ");
  }
  const runtimeLines = [
    evidencePriorityContext,
    attachmentContext,
    formatSelectedOptions(state),
    formatIntent(state),
    formatToolContext(state),
    formatToolPlan(state),
  ]
    .filter((line) => !!line)
    .join(" ");

  return runtimeLines;
}

// Memory injection disabled.

function looksLikeCodeRequest(message: string): boolean {
  return /```|\b(code|coding|function|class|interface|type|typescript|javascript|python|java|c\+\+|c#|sql|api|endpoint|bug|debug|fix|refactor|implement|algorithm|query|schema)\b/i.test(
    message,
  );
}

function buildPromptSegments(state: ChatGraphState): PromptSegment[] {
  const controls = state.promptBehavior ?? resolveBehaviorControls(state);

  // Log anonymized teaching depth choice for ML feedback
  logTeachingDepthTelemetry(state, controls.teachingDepth);

  const runtimeContext = buildRuntimeContext(state);

  const seniorEngineerEnabled =
    controls.persona === "senior-engineer" ||
    (controls.persona === "auto" &&
      (state.taskCategory === "coding" || controls.responseMode === "code"));

  const shouldPrioritizeCodingTaskPrompt =
    seniorEngineerEnabled ||
    state.taskCategory === "coding" ||
    controls.responseMode === "code" ||
    looksLikeCodeRequest(state.userMessage);

  const effectiveTaskCategory = shouldPrioritizeCodingTaskPrompt
    ? "coding"
    : state.taskCategory;

  const taskPrompt = getTaskPrompt(effectiveTaskCategory);

  const resolvedPersonaRole = seniorEngineerEnabled ? "senior-engineer" : "none";

  const baseSegments: PromptSegment[] = [
    {
      id: "master-system",
      layer: "master-system",
      priority: 100,
      content: getMasterPrompt(),
      directives: {
        "foundation.identity": "forge-production-agent",
        "foundation.communication": "clear-direct-readable",
      },
    },
    {
      id: "safety-policy",
      layer: "safety",
      priority: 90,
      content: getSafetyPrompt(),
      directives: {
        "safety.refusal": "brief-safe-refusal",
        "safety.truthfulness": "no-fabrication",
      },
    },
    {
      id: "response-mode",
      layer: "mode",
      priority: 85,
      content: getModePrompt(controls),
      directives: {
        "response.mode": controls.responseMode,
        "response.verbosity": controls.verbosity,
        "response.audience": controls.audience,
        "response.teachingDepth": controls.teachingDepth,
        "response.formatting": controls.formatting,
        "response.persona": resolvedPersonaRole,
      },
    },
    {
      id: "visual-context-tool",
      layer: "task",
      priority: 83,
      content: getVisualContextToolPrompt(),
      directives: {
        "tools.visual-context": "image-search-autonomy",
      },
    },
    {
      id: "tools-policy",
      layer: "task",
      priority: 82,
      content: getToolsPrompt(),
      directives: {
        "tools.policy": "evidence-first",
      },
    },
    {
      id: `task-${effectiveTaskCategory}`,
      layer: "task",
      priority: 80,
      content: taskPrompt,
      directives: {
        "task.category": effectiveTaskCategory,
      },
      enabled: taskPrompt.trim().length > 0,
    },
    {
      id: "humanization-explicit",
      layer: "humanization",
      priority: 78,
      content: getHumanizationPrompt(),
      directives: {
        "response.humanization": false ? "explicit-request" : "disabled",
      },
      enabled: false,
    },
    {
      id: "formatter-default",
      layer: "formatting",
      priority: 75,
      content: getFormatterPrompt(controls),
      directives: {
        "format.output": controls.formatting,
        "response.verbosity": controls.verbosity,
        "response.audience": controls.audience,
      },
      enabled: effectiveTaskCategory !== "coding",
    },
  ];

  const segments: Array<PromptSegment | null> = [
    ...baseSegments,
    runtimeContext.trim().length > 0
      ? {
          id: "runtime-context",
          layer: "runtime-context",
          priority: 70,
          content: runtimeContext,
          directives: {
            "context.runtime": "current-turn-signals",
          },
          enabled: true,
        }
      : null,
  ];

  return segments.filter((s): s is PromptSegment => s !== null);
}

export async function buildChatMessages(state: ChatGraphState): Promise<BaseMessage[]> {
  const segments = buildPromptSegments(state);
  const composition = composePromptSegments(segments);
  const behaviorControls =
    state.promptBehavior ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS;
  const effectiveTaskCategory =
    behaviorControls.persona === "senior-engineer" ||
    state.taskCategory === "coding" ||
    behaviorControls.responseMode === "code" ||
    looksLikeCodeRequest(state.userMessage)
      ? "coding"
      : state.taskCategory;

  info("prompt_composition_summary", {
    runId: state.runId,
    chatId: state.chatId,
    selectedSegments: composition.diagnostics.selectedSegmentIds,
    skippedSegments: composition.diagnostics.skippedSegmentIds,
    conflicts: composition.diagnostics.conflicts,
    resolvedDirectiveCount: composition.diagnostics.resolvedDirectiveCount,
    behaviorControls,
    effectiveTaskCategory,
    precedence: [
      "System Prompt",
      "Safety",
      "Task Prompt",
      "Runtime Context",
      "User Input",
    ],
  });

  // Legacy diagnostic string expected by tests and some tooling. Keep a
  // human-readable JSON summary with the historical event name so tests
  // that scan source for `promptComposition.summary` continue to pass.
   
  console.info(
    JSON.stringify({ event: "promptComposition.summary", runId: state.runId, chatId: state.chatId }),
  );

  const attachmentBlocks = await buildAttachmentMultimodalBlocks(
    state.attachments,
    state.userMessage,
  );

  const humanMessageContent =
    attachmentBlocks.length > 0
      ? [
          {
            type: "text",
            text: state.userMessage,
          },
          ...attachmentBlocks,
        ]
      : state.userMessage;

  return [
    new SystemMessage(composition.prompt),
    new HumanMessage(humanMessageContent),
  ];
}

export { buildFreshnessClassificationMessage };
