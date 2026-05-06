import { MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/actions/projects";
import { getProjectChats } from "@/lib/actions/chats";
import { ProjectPageClient } from "./ProjectPageClient";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const chats = await getProjectChats(projectId);

  return (
    <div className="relative h-full overflow-hidden bg-background px-6 py-6 lg:px-8">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 30%, rgba(16,163,127,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 h-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Project
            </p>
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              {project.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-72 items-center gap-2 rounded-full border border-border bg-card px-4 text-muted-foreground">
              <Search size={14} />
              <span className="text-[14px]">Search chats</span>
            </div>

            <ProjectPageClient projectId={projectId} />
          </div>
        </div>

        <div className="mt-8 inline-flex items-center rounded-full bg-accent px-4 py-1.5 text-[13px] text-foreground">
          Chats in this project
        </div>

        <div className="mt-4 grid grid-cols-[minmax(280px,1fr)_150px] items-center px-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Chat</span>
          <span>Location</span>
        </div>

        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card/60">
          {chats.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No chats in this project yet
              <br />
              Create one to begin.
            </div>
          ) : (
            chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/c/${chat.id}`}
                className="grid grid-cols-[minmax(280px,1fr)_150px] items-center border-b border-border px-3 py-3 last:border-b-0 transition-colors duration-150 hover:bg-accent active:bg-accent/80"
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-[14px] font-medium text-foreground">
                    <MessageSquare
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{chat.title}</span>
                  </span>
                </div>

                <span className="text-[12px] text-muted-foreground">
                  /{project.name.toLowerCase()}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
