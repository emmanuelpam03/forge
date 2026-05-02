import "server-only";

import prisma from "@/lib/prisma";

type InsightConfidence = "high" | "medium" | "low";

export type InsightCard = {
  title: string;
  detail: string;
  sources: string[];
  confidence: InsightConfidence;
  link?: string;
};

export type ProjectActivityItem = {
  id: string;
  chatId: string;
  chatTitle: string;
  role: string;
  content: string;
  createdAt: string;
};

export type ProjectIntelligence = {
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  };
  chats: Array<{
    id: string;
    title: string;
    summary: string | null;
    lastMessageAt: string;
  }>;
  goals: InsightCard[];
  decisions: InsightCard[];
  currentFocus: InsightCard[];
  problems: InsightCard[];
  recentActivity: ProjectActivityItem[];
  memorySignals: InsightCard[];
};

type MessageSample = {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date;
  chat: {
    title: string;
  };
};

type ChatSample = {
  id: string;
  title: string;
  summary: string | null;
  lastMessageAt: Date;
};

const GOAL_HINTS = [
  "want to",
  "need to",
  "goal",
  "aim",
  "build",
  "ship",
  "launch",
  "plan",
  "focus on",
  "working on",
];

const DECISION_HINTS = [
  "decided",
  "decision",
  "choose",
  "chosen",
  "going with",
  "we'll use",
  "use",
  "switched to",
  "settled on",
];

const BLOCKER_HINTS = [
  "blocked",
  "blocker",
  "problem",
  "issue",
  "stuck",
  "error",
  "failing",
  "can't",
  "cannot",
  "need help",
];

const FOCUS_HINTS = [
  "current",
  "now",
  "working on",
  "next",
  "today",
  "doing",
  "focus",
  "priority",
];

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sentenceFragments(text: string): string[] {
  return cleanText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueByText(items: InsightCard[]): InsightCard[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.title}::${item.detail}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function makeInsight(
  title: string,
  detail: string,
  sources: string[],
  confidence: InsightConfidence,
  link?: string,
): InsightCard {
  return {
    title: cleanText(title),
    detail: cleanText(detail),
    sources: Array.from(new Set(sources.filter(Boolean))),
    confidence,
    link,
  };
}

function hasAnyHint(text: string, hints: string[]): boolean {
  const normalized = text.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

function keywordOverlap(text: string, keywords: string[]): number {
  const normalized = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    return normalized.includes(keyword.toLowerCase()) ? count + 1 : count;
  }, 0);
}

function buildKeywords(
  projectName: string,
  description: string | null,
  chats: ChatSample[],
): string[] {
  const pieces = [
    projectName,
    description ?? "",
    ...chats.map((chat) => chat.title),
    ...chats.map((chat) => chat.summary ?? ""),
  ];

  return Array.from(
    new Set(
      pieces
        .join(" ")
        .split(/[^a-zA-Z0-9]+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3),
    ),
  ).slice(0, 24);
}

function extractCandidates(
  texts: Array<{
    text: string;
    source: string;
    chatId?: string;
    chatTitle?: string;
  }>,
  hints: string[],
  keywords: string[],
): InsightCard[] {
  const cards: InsightCard[] = [];

  for (const item of texts) {
    const fragments = sentenceFragments(item.text);

    for (const fragment of fragments) {
      if (!hasAnyHint(fragment, hints)) {
        continue;
      }

      const overlap = keywordOverlap(fragment, keywords);
      if (overlap === 0 && item.source !== "project-description") {
        continue;
      }

      const confidence: InsightConfidence =
        overlap > 2 ? "high" : overlap > 0 ? "medium" : "low";
      const title =
        fragment.length > 68 ? `${fragment.slice(0, 68)}...` : fragment;
      const detail = item.chatTitle
        ? `${fragment} — ${item.chatTitle}`
        : fragment;

      cards.push(
        makeInsight(
          title,
          detail,
          [item.source, item.chatTitle ?? ""],
          confidence,
          item.chatId ? `/c/${item.chatId}` : undefined,
        ),
      );
    }
  }

  return uniqueByText(cards).slice(0, 6);
}

function deriveCurrentFocus(
  chats: ChatSample[],
  messages: MessageSample[],
  keywords: string[],
): InsightCard[] {
  const focusCards: InsightCard[] = [];

  const latestChat = chats[0];
  if (latestChat) {
    const summary = latestChat.summary?.trim();
    if (summary) {
      const fragments = sentenceFragments(summary);
      const bestFragment =
        fragments.find((fragment) => hasAnyHint(fragment, FOCUS_HINTS)) ??
        fragments[0];

      if (bestFragment) {
        focusCards.push(
          makeInsight(
            latestChat.title,
            bestFragment,
            ["chat summary", latestChat.title],
            keywordOverlap(bestFragment, keywords) > 1 ? "high" : "medium",
            `/c/${latestChat.id}`,
          ),
        );
      }
    }
  }

  const latestMessage = messages[0];
  if (latestMessage) {
    const fragment =
      sentenceFragments(latestMessage.content)[0] ?? latestMessage.content;
    if (fragment) {
      focusCards.push(
        makeInsight(
          latestMessage.chatTitle,
          fragment,
          ["recent message", latestMessage.chatTitle],
          keywordOverlap(fragment, keywords) > 1 ? "high" : "medium",
          `/c/${latestMessage.chatId}`,
        ),
      );
    }
  }

  return uniqueByText(focusCards).slice(0, 4);
}

function deriveRecentActivity(
  messages: MessageSample[],
): ProjectActivityItem[] {
  return messages.slice(0, 10).map((message) => ({
    id: message.id,
    chatId: message.chatId,
    chatTitle: message.chat.title,
    role: message.role,
    content: cleanText(message.content),
    createdAt: message.createdAt.toISOString(),
  }));
}

function deriveFromProjectDescription(
  projectName: string,
  description: string | null,
  chatCount: number,
): InsightCard[] {
  if (!description) {
    return [];
  }

  const fragment = sentenceFragments(description)[0] ?? description;
  return [
    makeInsight(
      projectName,
      fragment,
      ["project description"],
      chatCount > 0 ? "high" : "medium",
    ),
  ];
}

function deriveMemorySignals(
  memorySummary: string | null,
  keywords: string[],
): InsightCard[] {
  if (!memorySummary) {
    return [];
  }

  const lines = memorySummary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => keywordOverlap(line, keywords) > 0);

  return lines.slice(0, 4).map((line) => {
    const confidence: InsightConfidence = hasAnyHint(line, DECISION_HINTS)
      ? "medium"
      : "low";

    return makeInsight(line, line, ["memory summary"], confidence);
  });
}

function buildSectionInsights(
  texts: Array<{
    text: string;
    source: string;
    chatId?: string;
    chatTitle?: string;
  }>,
  hints: string[],
  keywords: string[],
): InsightCard[] {
  return extractCandidates(texts, hints, keywords).slice(0, 5);
}

export async function getProjectIntelligence(
  projectId: string,
): Promise<ProjectIntelligence | null> {
  const [project, chats, messages, memorySummary] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.chat.findMany({
      where: { projectId, isArchived: false },
      orderBy: { lastMessageAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        summary: true,
        lastMessageAt: true,
      },
    }),
    prisma.message.findMany({
      where: {
        chat: {
          projectId,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 18,
      select: {
        id: true,
        chatId: true,
        role: true,
        content: true,
        createdAt: true,
        chat: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.memorySummary.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        summary: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!project) {
    return null;
  }

  const normalizedChats: ChatSample[] = chats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    summary: chat.summary,
    lastMessageAt: chat.lastMessageAt,
  }));

  const normalizedMessages: MessageSample[] = messages.map((message) => ({
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    chat: {
      title: message.chat.title,
    },
  }));

  const keywords = buildKeywords(
    project.name,
    project.description,
    normalizedChats,
  );
  const textSources = [
    ...normalizedChats.map((chat) => ({
      text: [chat.title, chat.summary ?? ""].filter(Boolean).join("\n"),
      source: chat.summary ? "chat-summary" : "chat-title",
      chatId: chat.id,
      chatTitle: chat.title,
    })),
    ...normalizedMessages.map((message) => ({
      text: message.content,
      source: `message:${message.role}`,
      chatId: message.chatId,
      chatTitle: message.chat.title,
    })),
  ];

  const projectDescriptionCards = deriveFromProjectDescription(
    project.name,
    project.description,
    normalizedChats.length,
  );

  const goals = uniqueByText([
    ...projectDescriptionCards,
    ...buildSectionInsights(textSources, GOAL_HINTS, keywords),
  ]).slice(0, 5);

  const decisions = uniqueByText(
    buildSectionInsights(textSources, DECISION_HINTS, keywords),
  ).slice(0, 5);

  const currentFocus = deriveCurrentFocus(
    normalizedChats,
    normalizedMessages,
    keywords,
  );

  const problems = uniqueByText(
    buildSectionInsights(textSources, BLOCKER_HINTS, keywords),
  ).slice(0, 5);

  const recentActivity = deriveRecentActivity(normalizedMessages);

  const memorySignals = deriveMemorySignals(
    memorySummary?.summary ?? null,
    keywords,
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    chats: normalizedChats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      summary: chat.summary,
      lastMessageAt: chat.lastMessageAt.toISOString(),
    })),
    goals,
    decisions,
    currentFocus,
    problems,
    recentActivity,
    memorySignals,
  };
}
