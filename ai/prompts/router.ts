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
  getMasterPrompt,
  getModePrompt,
  getSafetyPrompt,
  getTaskPrompt,
  getToolsPrompt,
} from "@/ai/prompts/promptRegistry";
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
import { formatSelectedContext } from "@/ai/context/engine";
import type { ChatGraphState } from "@/ai/graph/state";

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
  if (
    /\b(explain|why|how|walk me through|teach me|break down)\b/.test(message)
  ) {
    return "deep";
  }
  if (/\b(just answer|no explanation|brief)\b/.test(message)) {
    return "minimal";
  }

  return "standard";
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
  };
}

function formatPreferences(state: ChatGraphState): string {
  if (state.preferences.length === 0) {
    return "No saved preferences.";
  }

  return state.preferences
    .map((preference) => {
      const category = preference.category ? `${preference.category} ` : "";
      return `${category}${preference.key} = ${preference.value}`;
    })
    .join("; ");
}

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

function formatMemorySummary(state: ChatGraphState): string {
  if (!state.memorySummary) {
    return "No memory summary available.";
  }

  return `Memory summary version ${state.memorySummary.version}: ${state.memorySummary.summary}`;
}

function formatHistory(state: ChatGraphState): string {
  if (state.previousMessages.length === 0) {
    return "No previous messages.";
  }

  return state.previousMessages
    .map((message) => `${message.role} said ${message.content}`)
    .join(" ");
}

function formatToolContext(state: ChatGraphState): string {
  if (state.evidenceBundles.length === 0 && !state.toolContext) {
    return "No tool outputs captured.";
  }

  let context = "";

  if (state.evidenceBundles.length > 0) {
    context = state.evidenceBundles
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

  if (state.selectedContext) {
    const selectedContext = formatSelectedContext(state.selectedContext);
    return [evidencePriorityContext, selectedContext].filter(Boolean).join(" ");
  }

  return [
    evidencePriorityContext,
    formatIntent(state),
    formatToolContext(state),
    formatToolPlan(state),
  ]
    .filter((line) => line !== "")
    .join(" ");
}

function buildMemoryInjection(state: ChatGraphState): string {
  return [
    `Project context is ${formatMemorySummary(state)}.`,
    `User preferences are ${formatPreferences(state)}.`,
    `Recent conversation is ${formatHistory(state)}.`,
  ].join(" ");
}

function buildPromptSegments(state: ChatGraphState): PromptSegment[] {
  const controls = state.promptBehavior ?? resolveBehaviorControls(state);
  const taskPrompt = getTaskPrompt(state.taskCategory);
  const runtimeContext = buildRuntimeContext(state);
  const memoryInjection = buildMemoryInjection(state);

  return [
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
      id: `task-${state.taskCategory}`,
      layer: "task",
      priority: 80,
      content: taskPrompt,
      directives: {
        "task.category": state.taskCategory,
      },
      enabled: taskPrompt.trim().length > 0,
    },
    {
      id: "formatter-default",
      layer: "formatting",
      priority: 75,
      content: getFormatterPrompt(),
      directives: {
        "format.output": "readable-clean-structured",
      },
    },
    {
      id: "runtime-context",
      layer: "runtime-context",
      priority: 70,
      content: runtimeContext,
      directives: {
        "context.runtime": "current-turn-signals",
      },
      enabled: runtimeContext.trim().length > 0,
    },
    {
      id: "memory-injection",
      layer: "memory-injection",
      priority: 65,
      content: memoryInjection,
      directives: {
        "context.memory": "historical-and-preference-context",
      },
      enabled: memoryInjection.trim().length > 0,
    },
  ];
}

export function buildChatMessages(state: ChatGraphState): BaseMessage[] {
  const segments = buildPromptSegments(state);
  const composition = composePromptSegments(segments);

  console.info(
    JSON.stringify({
      event: "promptComposition.summary",
      runId: state.runId,
      chatId: state.chatId,
      selectedSegments: composition.diagnostics.selectedSegmentIds,
      skippedSegments: composition.diagnostics.skippedSegmentIds,
      conflicts: composition.diagnostics.conflicts,
      resolvedDirectiveCount: composition.diagnostics.resolvedDirectiveCount,
      behaviorControls:
        state.promptBehavior ?? DEFAULT_PROMPT_BEHAVIOR_CONTROLS,
      precedence: [
        "System Prompt",
        "Safety",
        "Task Prompt",
        "Runtime Context",
        "User Input",
      ],
    }),
  );

  return [
    new SystemMessage(composition.prompt),
    new HumanMessage(state.userMessage),
  ];
}

export { buildFreshnessClassificationMessage };
