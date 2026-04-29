import { Annotation } from "@langchain/langgraph";
import type { MessageRole } from "@/app/generated/prisma/enums";

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

export type ChatGraphState = {
  chatId: string;
  userMessage: string;
  runId: string;
  previousMessages: ChatMessageSnapshot[];
  preferences: PreferenceSnapshot[];
  memorySummary: MemorySummarySnapshot | null;
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
});

export type ChatGraphInput = Pick<
  ChatGraphState,
  "chatId" | "userMessage" | "runId"
>;

export const createChatGraphSeed = (input: ChatGraphInput): ChatGraphState => ({
  chatId: input.chatId,
  userMessage: input.userMessage,
  runId: input.runId,
  previousMessages: [],
  preferences: [],
  memorySummary: null,
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
});
