import { Annotation } from "@langchain/langgraph";
import type { MessageRole } from "@/app/generated/prisma/enums";
import type { SelectedContext } from "@/ai/context/engine";
import type { QueryIntentClassification } from "@/ai/graph/classification";

export type ClassificationIntent =
  | "factual"
  | "reasoning"
  | "code"
  | "creative";

export type ClassificationConfidence = "high" | "medium" | "low";

export type ClassifiedIntent = {
  intent: ClassificationIntent;
  requiresFreshData: boolean;
  confidence: ClassificationConfidence;
};

export type PromptTaskCategory =
  | "coding"
  | "reasoning"
  | "planning"
  | "explanation"
  | "trading"
  | "general";

export type ChatMessageSnapshot = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  modelUsed?: string | null;
  provider?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  latencyMs?: number | null;
  runId?: string | null;
  traceId?: string | null;
};

export type PreferenceSnapshot = {
  key: string;
  value: string;
  category: string | null;
};

export type MemorySummarySnapshot = {
  id: string;
  summary: string;
  version: number;
  updatedAt: string;
};

export type ToolPlan = {
  intent: string;
  toolsNeeded: string[];
  sequential: boolean;
  followUpNeeded: boolean;
  followUpQuestion?: string;
};

export type EvidenceBundle = {
  tool: string;
  content: string;
  timestamp: string;
};

export type ChatGraphState = {
  chatId: string;
  userMessage: string;
  parentMessageId?: string | null;
  branchId?: string | null;
  assistantMessageId?: string | null;
  skipUserCreate?: boolean;
  runId: string;
  previousMessages: ChatMessageSnapshot[];
  preferences: PreferenceSnapshot[];
  memorySummary: MemorySummarySnapshot | null;
  selectedContext?: SelectedContext;
  contextBudgetTokens?: number;
  retrievedSnippets?: string[];
  assistantMessage: string;
  modelUsed: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  traceId: string;
  intent: string;
  toolsUsed: string[];
  toolContext: string;
  extractedMemory: string;
  generatedTitle: string;
  toolPlan: ToolPlan | null;
  executionMode: "none" | "single" | "multi-parallel" | "multi-sequential";
  evidenceBundles: EvidenceBundle[];
  synthesisNote: string;
  queryIntent: QueryIntentClassification | null;
  classifiedIntent: ClassifiedIntent | null;
  taskCategory: PromptTaskCategory;
  preResponsePromise?: Promise<void>;
  /**
   * When set, forces the graph to execute a specific tool (e.g. "webSearch").
   */
  forceTool?: string | null;
};

const lastValue = <T>(_: T, update: T) => update;

export const chatGraphState = Annotation.Root({
  chatId: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  userMessage: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  runId: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  previousMessages: Annotation<ChatMessageSnapshot[]>({
    default: () => [],
    reducer: lastValue,
  }),
  preferences: Annotation<PreferenceSnapshot[]>({
    default: () => [],
    reducer: lastValue,
  }),
  memorySummary: Annotation<MemorySummarySnapshot | null>({
    default: () => null,
    reducer: lastValue,
  }),
  selectedContext: Annotation<SelectedContext | undefined>({
    default: () => undefined,
    reducer: lastValue,
  }),
  contextBudgetTokens: Annotation<number | undefined>({
    default: () => undefined,
    reducer: lastValue,
  }),
  retrievedSnippets: Annotation<string[] | undefined>({
    default: () => undefined,
    reducer: lastValue,
  }),
  assistantMessage: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  modelUsed: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  provider: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  inputTokens: Annotation<number>({
    default: () => 0,
    reducer: lastValue,
  }),
  outputTokens: Annotation<number>({
    default: () => 0,
    reducer: lastValue,
  }),
  latencyMs: Annotation<number>({
    default: () => 0,
    reducer: lastValue,
  }),
  traceId: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  intent: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  toolsUsed: Annotation<string[]>({
    default: () => [],
    reducer: lastValue,
  }),
  toolContext: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  extractedMemory: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  generatedTitle: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  toolPlan: Annotation<ToolPlan | null>({
    default: () => null,
    reducer: lastValue,
  }),
  executionMode: Annotation<
    "none" | "single" | "multi-parallel" | "multi-sequential"
  >({
    default: () => "none",
    reducer: lastValue,
  }),
  evidenceBundles: Annotation<EvidenceBundle[]>({
    default: () => [],
    reducer: lastValue,
  }),
  synthesisNote: Annotation<string>({
    default: () => "",
    reducer: lastValue,
  }),
  queryIntent: Annotation<QueryIntentClassification | null>({
    default: () => null,
    reducer: lastValue,
  }),
  classifiedIntent: Annotation<{
    intent: ClassificationIntent;
    requiresFreshData: boolean;
    confidence: ClassificationConfidence;
  } | null>({
    default: () => null,
    reducer: lastValue,
  }),
  taskCategory: Annotation<PromptTaskCategory>({
    default: () => "general",
    reducer: lastValue,
  }),
  forceTool: Annotation<string | null>({
    default: () => null,
    reducer: lastValue,
  }),
});

export type ChatGraphInput = Pick<
  ChatGraphState,
  | "chatId"
  | "userMessage"
  | "runId"
  | "forceTool"
  | "classifiedIntent"
  | "parentMessageId"
  | "branchId"
  | "assistantMessageId"
  | "skipUserCreate"
> & {
  model?: string;
  provider?: string;
};

export const createChatGraphSeed = (input: ChatGraphInput): ChatGraphState => ({
  chatId: input.chatId,
  userMessage: input.userMessage,
  parentMessageId: input.parentMessageId ?? null,
  branchId: input.branchId ?? null,
  assistantMessageId: input.assistantMessageId ?? null,
  skipUserCreate: input.skipUserCreate ?? false,
  runId: input.runId,
  previousMessages: [],
  preferences: [],
  memorySummary: null,
  selectedContext: undefined,
  contextBudgetTokens: undefined,
  retrievedSnippets: undefined,
  assistantMessage: "",
  modelUsed: "",
  provider: "",
  inputTokens: 0,
  outputTokens: 0,
  latencyMs: 0,
  traceId: "",
  intent: "",
  toolsUsed: [],
  toolContext: "",
  extractedMemory: "",
  generatedTitle: "",
  toolPlan: null,
  executionMode: "none",
  evidenceBundles: [],
  synthesisNote: "",
  queryIntent: null,
  classifiedIntent: input.classifiedIntent ?? null,
  taskCategory: "general",
  forceTool: input.forceTool ?? null,
});
