import Link from "next/link";
import { notFound } from "next/navigation";
import { type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Compass,
  MessageSquareText,
  Target,
} from "lucide-react";
import { getProjectIntelligence } from "@/lib/actions/project-intelligence";
import { getProjectById } from "@/lib/actions/projects";

function SectionCard({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  items: Array<{
    title: string;
    detail: string;
    sources: string[];
    confidence: "high" | "medium" | "low";
    link?: string;
  }>;
  emptyLabel: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <Icon size={16} className="text-primary" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            {title}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            AI-derived from project context
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => {
            const body = (
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 transition-colors hover:border-primary/20 hover:bg-background">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-medium leading-5 text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {item.confidence}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.sources.slice(0, 3).map((source) => (
                    <span
                      key={source}
                      className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            );

            return item.link ? (
              <Link
                key={`${item.title}-${item.detail}`}
                href={item.link}
                className="block"
              >
                {body}
              </Link>
            ) : (
              <div key={`${item.title}-${item.detail}`}>{body}</div>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, intelligence] = await Promise.all([
    getProjectById(projectId),
    getProjectIntelligence(projectId),
  ]);

  if (!project || !intelligence) {
    notFound();
  }

  const recentChats = intelligence.chats.slice(0, 4);
  const recentActivity = intelligence.recentActivity.slice(0, 8);

  return (
    <div className="relative h-full overflow-hidden bg-background px-6 py-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 25%, rgba(16,163,127,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col gap-6 overflow-y-auto">
        <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <BrainCircuit size={12} />
              Project Intelligence Dashboard
            </div>
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-foreground">
                {project.name}
              </h1>
              <p className="mt-2 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {project.description ||
                  "No project description has been added yet."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-110">
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Chats
              </p>
              <p className="mt-2 text-[20px] font-semibold text-foreground">
                {intelligence.chats.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Goals
              </p>
              <p className="mt-2 text-[20px] font-semibold text-foreground">
                {intelligence.goals.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Decisions
              </p>
              <p className="mt-2 text-[20px] font-semibold text-foreground">
                {intelligence.decisions.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Signals
              </p>
              <p className="mt-2 text-[20px] font-semibold text-foreground">
                {intelligence.memorySignals.length}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <SectionCard
            title="Goals"
            icon={Target}
            items={intelligence.goals}
            emptyLabel="No clear goals have been extracted yet. Start a chat or add project context to populate this section."
          />

          <SectionCard
            title="Current Focus"
            icon={Compass}
            items={intelligence.currentFocus}
            emptyLabel="The current focus will appear once recent chats or summaries surface an active workstream."
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Key Decisions"
            icon={CheckCircle2}
            items={intelligence.decisions}
            emptyLabel="No major decisions have been extracted yet. This section fills as chats become more specific."
          />

          <SectionCard
            title="Problems / Blockers"
            icon={AlertTriangle}
            items={intelligence.problems}
            emptyLabel="No blockers have been detected from the current summaries or recent messages."
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                <Activity size={16} className="text-primary" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                  Recent Activity
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  Last important actions across project chats
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                  No recent activity yet.
                </div>
              ) : (
                recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={`/c/${item.chatId}`}
                    className="block rounded-2xl border border-border bg-background/60 px-4 py-3 transition-colors hover:border-primary/20 hover:bg-background"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          <span>{item.chatTitle}</span>
                          <span>•</span>
                          <span>{item.role}</span>
                        </div>
                        <p className="mt-2 text-[13px] leading-5 text-foreground">
                          {item.content}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                <MessageSquareText size={16} className="text-primary" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                  Overview
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  Project summary and nearby context
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Description
                </p>
                <p className="mt-2 text-[13px] leading-6 text-foreground">
                  {project.description || "No description available."}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Recent chats
                </p>
                <div className="mt-3 space-y-2">
                  {recentChats.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      No chats exist for this project yet.
                    </p>
                  ) : (
                    recentChats.map((chat) => (
                      <Link
                        key={chat.id}
                        href={`/c/${chat.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:border-primary/20 hover:bg-background"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {chat.title}
                          </p>
                          <p className="truncate text-[12px] text-muted-foreground">
                            {chat.summary || "No summary yet"}
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="shrink-0 text-muted-foreground"
                        />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Memory signals
                </p>
                <div className="mt-3 space-y-2">
                  {intelligence.memorySignals.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      No project-relevant memory signals were found in the
                      shared memory summary.
                    </p>
                  ) : (
                    intelligence.memorySignals.map((signal) => (
                      <div
                        key={`${signal.title}-${signal.detail}`}
                        className="rounded-xl border border-border bg-card px-3 py-2"
                      >
                        <p className="text-[13px] text-foreground">
                          {signal.detail}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
