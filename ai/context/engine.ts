import "server-only";

import prisma from "@/lib/prisma";
import type {
  ChatMessageSnapshot,
  MemorySummarySnapshot,
  PreferenceSnapshot,
} from "@/ai/graph/state";

/**
 * Context Engine: Token-budgeted, scope-aware context assembly for Forge.
 *
 * Responsibilities:
 * - Load and rank context by relevance and priority
 * - Estimate token cost for context sections
 * - Assemble prompt context within token budget
 * - Maintain separate chat, project, and user memory scopes
 * - Normalize tool outputs before injection
 */

export type ContextSection = {
  name: string;
  content: string;
  priority: number; // 1 (highest) to 10 (lowest)
  estimatedTokens: number;
};

export type SelectedContext = {
  recentTurns: ChatMessageSnapshot[];
  chatSummary: string | null;
  projectContext: string | null;
  preferences: PreferenceSnapshot[];
  userMemory: string | null;
  retrievedSnippets: string | null;
  sections: ContextSection[];
  totalEstimatedTokens: number;
  budgetUsed: number; // percentage
};

const TOKEN_BUDGET = 3000; // tokens reserved for context (system + history + prefs)
const RECENT_TURN_WINDOW = 6; // keep last 6 turns by default

/**
 * Rough token estimation for text.
 * 1 token ≈ 4 characters (simplified).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Load recent turns from a chat (bounded by RECENT_TURN_WINDOW).
 */
async function loadRecentTurns(
  chatId: string,
  limit: number = RECENT_TURN_WINDOW,
): Promise<ChatMessageSnapshot[]> {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    modelUsed: message.modelUsed,
    provider: message.provider,
    tokensInput: message.tokensInput,
    tokensOutput: message.tokensOutput,
    latencyMs: message.latencyMs,
    runId: message.runId,
    traceId: message.traceId,
  }));
}

/**
 * Load global user preferences (for now, single-user mode).
 * In future, scope by userId.
 */
async function loadUserPreferences(): Promise<PreferenceSnapshot[]> {
  const preferences = await prisma.preference.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return preferences.map((p) => ({
    key: p.key,
    value: p.value,
    category: p.category,
  }));
}

/**
 * Load the latest user memory summary.
 * In future, scope by userId.
 */
async function loadUserMemorySummary(): Promise<MemorySummarySnapshot | null> {
  const summary = await prisma.memorySummary.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!summary) return null;

  return {
    id: summary.id,
    summary: summary.summary,
    version: summary.version,
    updatedAt: summary.updatedAt.toISOString(),
  };
}

/**
 * Load project context snippets (if chat belongs to a project).
 * Uses simple lexical ranking for now.
 */
async function loadProjectContext(chatId: string): Promise<string | null> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { projectId: true, title: true },
  });

  if (!chat?.projectId) {
    return null;
  }

  // Load recent project messages (simple recency ranking)
  const messages = await prisma.message.findMany({
    where: {
      chat: { projectId: chat.projectId },
      role: { in: ["user", "assistant"] },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true, role: true, createdAt: true },
  });

  if (messages.length === 0) {
    return null;
  }

  // Take only the most recent messages
  const recentProjectMessages = messages
    .slice(0, 6)
    .reverse()
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return recentProjectMessages || null;
}

/**
 * Load project information and build project context summary.
 * Phase 5: Project-aware memory scoping.
 */
async function loadProjectInfo(chatId: string): Promise<{
  projectId: string | null;
  projectName: string | null;
  projectDescription: string | null;
  chatTitle: string | null;
}> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      projectId: true,
      title: true,
      project: {
        select: {
          name: true,
          description: true,
        },
      },
    },
  });

  return {
    projectId: chat?.projectId ?? null,
    projectName: chat?.project?.name ?? null,
    projectDescription: chat?.project?.description ?? null,
    chatTitle: chat?.title ?? null,
  };
}

/**
 * Build project memory summary from all chats in the project.
 * Phase 5: Maintain project-level continuity across multiple chats.
 */
async function buildProjectMemory(projectId: string): Promise<string | null> {
  const chats = await prisma.chat.findMany({
    where: { projectId },
    select: {
      id: true,
      title: true,
      summary: true,
    },
    orderBy: { lastMessageAt: "desc" },
    take: 5, // Top 5 recent chats in project
  });

  if (chats.length === 0) {
    return null;
  }

  // Build summary from chat titles and summaries
  const projectMemory = chats
    .map((chat) => {
      let entry = `Chat: "${chat.title}"`;
      if (chat.summary) {
        entry += `\n${chat.summary}`;
      }
      return entry;
    })
    .join("\n\n");

  return projectMemory
    ? `**Project Memory (${chats.length} chats):**\n${projectMemory}`
    : null;
}

/**
 * Assemble context sections in priority order.
 * Phase 5: Project-aware prioritization.
 * Rank by importance:
 * - For project chats: recent turns > project memory > chat summary > project context > prefs > user memory
 * - For standalone chats: recent turns > chat summary > project context > prefs > user memory
 */
function assembleContextSections(
  recentTurns: ChatMessageSnapshot[],
  chatSummary: string | null,
  projectContext: string | null,
  preferences: PreferenceSnapshot[],
  userMemory: string | null,
  projectMemory: string | null = null,
): ContextSection[] {
  const sections: ContextSection[] = [];

  // 1. Recent conversation turns (highest priority - always P1)
  if (recentTurns.length > 0) {
    const content = recentTurns
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");
    sections.push({
      name: "Recent Conversation",
      content,
      priority: 1,
      estimatedTokens: estimateTokens(content),
    });
  }

  // 2. Project memory (P2 for project chats, P5 for standalone)
  if (projectMemory) {
    sections.push({
      name: "Project Memory",
      content: projectMemory,
      priority: projectMemory ? 2 : 5,
      estimatedTokens: estimateTokens(projectMemory),
    });
  }

  // 3. Chat continuity summary (P3 normally, P4 if project)
  if (chatSummary) {
    const priority = projectMemory ? 4 : 3;
    sections.push({
      name: "Chat Summary",
      content: chatSummary,
      priority,
      estimatedTokens: estimateTokens(chatSummary),
    });
  }

  // 4. Project context (recent messages in project)
  if (projectContext && !projectMemory) {
    // Only add if no project memory (avoid duplication)
    sections.push({
      name: "Project Context",
      content: projectContext,
      priority: 5,
      estimatedTokens: estimateTokens(projectContext),
    });
  }

  // 5. User preferences
  if (preferences.length > 0) {
    const content = preferences
      .map((p) => `${p.category ? p.category + ": " : ""}${p.key} = ${p.value}`)
      .join("\n");
    sections.push({
      name: "User Preferences",
      content,
      priority: projectMemory ? 6 : 4,
      estimatedTokens: estimateTokens(content),
    });
  }

  // 6. User memory summary
  if (userMemory) {
    sections.push({
      name: "User Memory",
      content: userMemory,
      priority: projectMemory ? 7 : 5,
      estimatedTokens: estimateTokens(userMemory),
    });
  }

  return sections;
}

/**
 * Apply token budget to sections.
 * Keep highest-priority sections until budget is exhausted.
 */
function applyTokenBudget(
  sections: ContextSection[],
  budget: number = TOKEN_BUDGET,
): ContextSection[] {
  const selected: ContextSection[] = [];
  let remaining = budget;

  for (const section of sections) {
    if (remaining >= section.estimatedTokens) {
      selected.push(section);
      remaining -= section.estimatedTokens;
    }
  }

  return selected;
}

/**
 * Main context loading function.
 * Orchestrates all context loading and selection.
 * Phase 5: Project-aware loading.
 */
export async function loadContextForChat(
  chatId: string,
): Promise<SelectedContext> {
  // Load project info first to decide what to load next
  const projectInfo = await loadProjectInfo(chatId);

  // Parallel load of all context sources
  const [
    recentTurns,
    preferences,
    userMemory,
    projectContext,
    chatSummary,
    projectMemory,
  ] = await Promise.all([
    loadRecentTurns(chatId),
    loadUserPreferences(),
    loadUserMemorySummary(),
    loadProjectContext(chatId),
    loadChatSummary(chatId),
    projectInfo.projectId
      ? buildProjectMemory(projectInfo.projectId)
      : Promise.resolve(null),
  ]);

  // Format user memory summary if available
  const userMemoryText = userMemory
    ? `Version ${userMemory.version}: ${userMemory.summary}`
    : null;

  // Assemble all context sections in priority order (project-aware)
  const allSections = assembleContextSections(
    recentTurns,
    chatSummary,
    projectContext,
    preferences,
    userMemoryText,
    projectMemory,
  );

  // Apply token budget
  const selectedSections = applyTokenBudget(allSections);

  // Calculate total tokens used
  const totalTokens = selectedSections.reduce(
    (sum, s) => sum + s.estimatedTokens,
    0,
  );
  const budgetPercentage = Math.round((totalTokens / TOKEN_BUDGET) * 100);

  return {
    recentTurns,
    chatSummary: chatSummary || null,
    projectContext: projectContext || null,
    preferences,
    userMemory: userMemoryText || null,
    retrievedSnippets: null,
    sections: selectedSections,
    totalEstimatedTokens: totalTokens,
    budgetUsed: budgetPercentage,
  };
}

/**
 * Load chat summary for a specific chat.
 */
async function loadChatSummary(chatId: string): Promise<string | null> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { summary: true },
  });

  return chat?.summary ?? null;
}

/**
 * Maintain rolling chat summary.
 * Call after saving messages to update chat summary if needed.
 *
 * Strategy:
 * - Trigger summary generation when message count crosses thresholds (10, 20, 30, etc.)
 * - Summarize oldest messages beyond RECENT_TURN_WINDOW to preserve continuity
 * - Keep summary concise (<500 tokens) to preserve budget
 */
export async function maintainChatSummary(chatId: string): Promise<void> {
  // Count total messages in chat
  const messageCount = await prisma.message.count({
    where: { chatId },
  });

  // Only generate summary after 10+ messages
  const SUMMARY_THRESHOLD = 10;
  const SUMMARY_UPDATE_INTERVAL = 10; // Update every 10 messages

  if (messageCount < SUMMARY_THRESHOLD) {
    return; // Not enough messages yet
  }

  // Check if summary needs update (rough check: if message count is multiple of interval)
  if (messageCount % SUMMARY_UPDATE_INTERVAL !== 0) {
    return; // Not time to update yet
  }

  // Load all messages to understand conversation flow
  const allMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Extract everything except recent turns for summarization
  const recentWindow = RECENT_TURN_WINDOW;
  const messagesForSummary = allMessages.slice(0, -recentWindow);

  if (messagesForSummary.length === 0) {
    return; // Nothing to summarize
  }

  // Build summary text from older messages
  // This is a simple approach: extract key points from message sequence
  const summaryText = buildChatSummary(messagesForSummary);

  if (summaryText) {
    await prisma.chat.update({
      where: { id: chatId },
      data: { summary: summaryText },
    });
  }
}

/**
 * Build chat summary from messages.
 * Simple approach: concatenate user intents and key assistant responses.
 */
function buildChatSummary(
  messages: Array<{ role: string; content: string }>,
): string {
  const keyPoints: string[] = [];

  // Extract user queries and main assistant responses
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "user") {
      // Truncate long user messages to first ~100 chars
      const userContent = msg.content.substring(0, 150);
      keyPoints.push(
        `Q: ${userContent}${msg.content.length > 150 ? "..." : ""}`,
      );
    } else if (msg.role === "assistant" && i < messages.length - 1) {
      // Include brief assistant response
      const assistantContent = msg.content.substring(0, 100);
      keyPoints.push(
        `A: ${assistantContent}${msg.content.length > 100 ? "..." : ""}`,
      );
    }
  }

  // Keep summary under ~500 tokens by limiting points
  const summaryLines = keyPoints.slice(0, 20).join("\n");

  return summaryLines
    ? `**Chat Summary (${messages.length} messages processed):**\n${summaryLines}`
    : "";
}

/**
 * Format selected context sections for the prompt.
 */
export function formatSelectedContext(selected: SelectedContext): string {
  const lines: string[] = [];

  for (const section of selected.sections) {
    if (section.content.trim()) {
      lines.push(`## ${section.name}\n${section.content}`);
    }
  }

  return lines.join("\n\n");
}

/**
 * Phase 6: User Memory Durability
 * Functions to deduplicate, rank, and filter user-learned facts
 */

/**
 * Compute simple word overlap similarity between two strings.
 * Returns score 0-1 (1 = identical).
 * Used for deduplication detection.
 */
function computeSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

/**
 * Deduplicate extracted memories.
 * Removes near-identical facts to prevent redundancy.
 */
export function deduplicateMemories(
  memories: string[],
  similarityThreshold: number = 0.7,
): string[] {
  if (memories.length <= 1) return memories;

  const deduplicated: string[] = [];

  for (const memory of memories) {
    let isDuplicate = false;

    for (const existing of deduplicated) {
      const similarity = computeSimilarity(memory, existing);
      if (similarity >= similarityThreshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      deduplicated.push(memory);
    }
  }

  return deduplicated;
}

/**
 * Rank memories by relevance.
 * Scores: recency (5 points per day), length (more info = higher), uniqueness.
 */
export function rankMemories(
  memories: Array<{ text: string; createdAt?: Date }>,
): Array<{
  text: string;
  score: number;
}> {
  const now = Date.now();

  return memories
    .map((memory) => {
      let score = 0;

      // Recency: 5 points per day of freshness
      const ageMs = now - (memory.createdAt?.getTime() ?? now);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - ageDays * 0.1);

      // Length: more detail = higher value
      score += Math.min(memory.text.length / 100, 5);

      // Keywords: presence of action words or specifics
      const actionWords = [
        "learned",
        "discovered",
        "issue",
        "solution",
        "bug",
        "feature",
        "improve",
      ];
      if (actionWords.some((w) => memory.text.toLowerCase().includes(w))) {
        score += 2;
      }

      return { text: memory.text, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Filter stale memories.
 * Removes facts older than maxAge days with low relevance.
 */
export function filterStaleMemories(
  memories: Array<{ text: string; createdAt?: Date }>,
  maxAgeDays: number = 30,
): Array<{ text: string; createdAt?: Date }> {
  const now = Date.now();

  return memories.filter((memory) => {
    const ageMs = now - (memory.createdAt?.getTime() ?? now);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays < maxAgeDays;
  });
}

/**
 * Update user memory summary with new extracted fact.
 * Phase 6: Durable, deduplicated user memory.
 */
export async function updateUserMemory(extractedFact: string): Promise<void> {
  if (!extractedFact || extractedFact.trim().length === 0) {
    return; // Ignore empty facts
  }

  // Load latest memory summary
  const latest = await prisma.memorySummary.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  // Parse existing memories (simple line-split approach)
  const existingMemories =
    latest?.summary.split("\n").filter((l) => l.trim()) ?? [];

  // Add new fact if not duplicate
  const allMemories = [...existingMemories, extractedFact];
  const deduplicated = deduplicateMemories(allMemories);

  // Keep only most relevant (top 10) to avoid unbounded growth
  const ranked = rankMemories(
    deduplicated.map((text) => ({ text, createdAt: new Date() })),
  );
  const top10 = ranked.slice(0, 10).map((r) => r.text);

  // Update or create memory summary
  const newSummaryText = top10.join("\n");

  if (latest) {
    await prisma.memorySummary.update({
      where: { id: latest.id },
      data: {
        summary: newSummaryText,
        version: latest.version + 1,
      },
    });
  } else {
    await prisma.memorySummary.create({
      data: {
        summary: newSummaryText,
        version: 1,
      },
    });
  }
}

/**
 * Prune old memories if count exceeds limit.
 * Keeps highest-ranked memories.
 */
export async function pruneOldMemories(maxCount: number = 10): Promise<void> {
  const summary = await prisma.memorySummary.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!summary) return;

  const memories = summary.summary.split("\n").filter((l) => l.trim());

  if (memories.length > maxCount) {
    // Rank and keep top N
    const ranked = rankMemories(memories.map((text) => ({ text })));
    const kept = ranked.slice(0, maxCount).map((r) => r.text);

    await prisma.memorySummary.update({
      where: { id: summary.id },
      data: {
        summary: kept.join("\n"),
        version: summary.version + 1,
      },
    });
  }
}
