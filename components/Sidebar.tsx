"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useState } from "react";
import {
  Plus,
  ChevronDown,
  Folder,
  MessageSquare,
  MoreHorizontal,
  Search,
  Settings,
} from "lucide-react";
import { Project, RecentChat, useAppStore } from "@/stores/app-store";

function ProjectItem({
  project,
  active,
}: {
  project: Project;
  active: boolean;
}) {
  return (
    <Link
      href={project.href}
      className={`group flex items-center justify-between rounded-lg border-l-2 px-2.5 py-1.5 text-[14px] transition-colors duration-150 ${
        active
          ? "border-[#10a37f] bg-[#252525] text-white"
          : "border-transparent text-zinc-400 hover:bg-[#252525] hover:text-zinc-200"
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Folder size={13} />
        <span className="truncate font-medium tracking-[-0.01em]">
          {project.name}
        </span>
      </span>

      <button
        onClick={(e) => e.preventDefault()}
        className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-zinc-700 transition"
      >
        <MoreHorizontal size={13} />
      </button>
    </Link>
  );
}

function ChatItem({ chat }: { chat: RecentChat }) {
  return (
    <Link
      href={chat.href}
      className="group flex items-start justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-[#252525]"
    >
      <span className="flex gap-2 min-w-0">
        <MessageSquare size={13} className="mt-0.5 shrink-0 text-zinc-500" />

        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium leading-tight tracking-[-0.01em] text-zinc-300">
            {chat.title}
          </span>

          <span className="mt-0.5 block truncate text-[12px] leading-tight text-zinc-600">
            {chat.preview}
          </span>
        </span>
      </span>

      <button
        onClick={(e) => e.preventDefault()}
        className="ml-1 mt-0.5 opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-zinc-700 transition"
      >
        <MoreHorizontal size={13} className="text-zinc-500" />
      </button>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const projects = useAppStore((store) => store.projects);
  const recentChats = useAppStore((store) => store.recentChats);
  const createProject = useAppStore((store) => store.createProject);
  const createChat = useAppStore((store) => store.createChat);

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);

  const handleCreateProject = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    createProject();
    setProjectsOpen(true);
  };

  const handleCreateChat = () => {
    const chat = createChat();
    setChatsOpen(true);
    router.push(chat.href);
  };

  return (
    <aside className="flex h-screen w-62 shrink-0 flex-col border-r border-[#272727] bg-[#1a1a1a]">
      {/* Header */}
      <div className="border-b border-[#272727] p-2">
        <button
          onClick={handleCreateChat}
          className="flex items-center justify-center rounded-xl bg-[#10a37f] px-3 py-1.5 text-[12px] font-semibold tracking-[-0.01em] text-white transition hover:bg-[#0d8f6f]"
        >
          <span className="mr-1.5">New Chat</span>
          <Plus size={13} />
        </button>

        <button className="mt-1.5 flex w-full items-center gap-2 rounded-xl bg-[#222222] px-3 py-1.5 text-[12px] text-zinc-400 transition hover:bg-[#2a2a2a] hover:text-zinc-200">
          <Search size={13} />
          Search Chats
        </button>
      </div>

      {/* Projects */}
      <div className="px-3 pt-4 pb-1">
        <div className="group mb-1.5 flex w-full items-center justify-between px-1 py-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Projects
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCreateProject}
              className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-[#2a2a2a]"
            >
              <Plus size={13} className="text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={() => setProjectsOpen((v) => !v)}
              className="rounded p-0.5 hover:bg-[#2a2a2a]"
            >
              <ChevronDown
                size={14}
                className={`text-zinc-500 transition-transform ${
                  !projectsOpen ? "-rotate-90" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {projectsOpen && (
          <div className="space-y-0.5">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                active={pathname === project.href}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-3 my-2 h-px bg-[#272727]" />

      {/* Recent Chats */}
      <div className="flex-1 overflow-y-auto px-3">
        <button
          onClick={() => setChatsOpen((v) => !v)}
          className="mb-1.5 flex w-full items-center justify-between px-1 py-1"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Recents
          </span>

          <ChevronDown
            size={13}
            className={`text-zinc-500 transition-transform ${
              !chatsOpen ? "-rotate-90" : ""
            }`}
          />
        </button>

        {chatsOpen && (
          <div className="space-y-0.5">
            {recentChats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#272727] p-2.5">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-zinc-400 transition hover:bg-[#252525] hover:text-zinc-200"
        >
          <Settings size={14} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
