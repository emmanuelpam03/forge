"use client";

import { MessageSquare, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projects = useAppStore((store) => store.projects);
  const recentChats = useAppStore((store) => store.recentChats);
  const createChat = useAppStore((store) => store.createChat);

  const projectId = params.projectId;
  const project = projects.find((item) => item.id === projectId);
  const projectChats = recentChats.filter(
    (chat) => chat.projectId === projectId,
  );

  const handleCreateProjectChat = () => {
    const chat = createChat(projectId);
    router.push(chat.href);
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#111111] px-6 py-6 lg:px-8">
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Project
            </p>
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-zinc-100">
              {project?.name ?? "Project"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-72 items-center gap-2 rounded-full border border-[#343434] bg-[#171717] px-4 text-zinc-400">
              <Search size={14} />
              <span className="text-[14px]">Search chats</span>
            </div>

            <button
              onClick={handleCreateProjectChat}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#10a37f] px-4 text-sm font-medium text-white transition hover:bg-[#0d8f6f]"
            >
              <Plus size={14} />
              New chat
            </button>
          </div>
        </div>

        <div className="mt-8 inline-flex items-center rounded-full bg-[#2b2b2b] px-4 py-1.5 text-[13px] text-zinc-100">
          Chats in this project
        </div>

        <div className="mt-4 grid grid-cols-[minmax(280px,1fr)_150px] items-center px-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          <span>Chat</span>
          <span>Location</span>
        </div>

        <div className="mt-2 overflow-hidden rounded-2xl border border-[#242424] bg-[#151515]/40">
          {projectChats.length === 0 && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No chats in this project yet. Create one to get started.
            </div>
          )}

          {projectChats.map((chat) => (
            <Link
              key={chat.id}
              href={chat.href}
              className="grid grid-cols-[minmax(280px,1fr)_150px] items-center border-b border-[#262626] px-3 py-3 last:border-b-0 transition-colors duration-150 hover:bg-[#1b1b1b] active:bg-[#202020]"
            >
              <div className="min-w-0">
                <span className="flex items-center gap-2 text-[14px] font-medium text-zinc-200">
                  <MessageSquare size={14} className="shrink-0 text-zinc-500" />
                  <span className="truncate">{chat.title}</span>
                </span>
                <p className="mt-1 truncate text-[12px] text-zinc-500">
                  {chat.preview}
                </p>
              </div>

              <span className="text-[12px] text-zinc-400">
                /{project?.name?.toLowerCase() ?? "project"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
