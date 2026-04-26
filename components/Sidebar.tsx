"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
      <span className="flex min-w-0 items-center gap-2">
        <Folder size={13} />
        <span className="truncate font-medium tracking-[-0.01em]">
          {project.name}
        </span>
      </span>

      <button
        onClick={(event) => event.preventDefault()}
        className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-700"
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
      <span className="flex min-w-0 gap-2">
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
        onClick={(event) => event.preventDefault()}
        className="ml-1 mt-0.5 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-700"
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
  const [collapsed, setCollapsed] = useState(false);

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

  const collapsedRecentChats = recentChats.slice(0, 6);

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-[#272727] bg-[#1a1a1a] transition-[width] duration-200 ${
        collapsed ? "w-18.5" : "w-62"
      }`}
    >
      <div className="border-b border-[#272727] p-2">
        <div className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-[#252525] hover:text-zinc-200"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          <button
            onClick={handleCreateChat}
            className={`flex items-center justify-center rounded-xl bg-[#10a37f] text-[12px] font-semibold tracking-[-0.01em] text-white transition hover:bg-[#0d8f6f] ${
              collapsed ? "h-8 w-8" : "px-3 py-1.5"
            }`}
            title="New Chat"
            aria-label="New Chat"
          >
            {!collapsed && <span className="mr-1.5">New Chat</span>}
            <Plus size={13} />
          </button>
        </div>

        <button
          className={`mt-1.5 flex w-full items-center rounded-xl bg-[#222222] text-[12px] text-zinc-400 transition hover:bg-[#2a2a2a] hover:text-zinc-200 ${
            collapsed ? "justify-center px-0 py-2" : "gap-2 px-3 py-1.5"
          }`}
          title="Search Chats"
          aria-label="Search Chats"
        >
          <Search size={13} />
          {!collapsed && "Search Chats"}
        </button>
      </div>

      {collapsed ? (
        <>
          <div className="px-2 pt-3">
            <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              P
            </div>
            <div className="space-y-1.5">
              {projects.map((project) => {
                const active = pathname === project.href;
                const initial =
                  project.name.trim().charAt(0).toUpperCase() || "P";

                return (
                  <Link
                    key={project.id}
                    href={project.href}
                    title={project.name}
                    aria-label={project.name}
                    className={`flex h-9 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition-colors ${
                      active
                        ? "border-[#10a37f] bg-[#0f2a23] text-white"
                        : "border-[#2b2b2b] bg-[#202020] text-zinc-400 hover:border-[#3a3a3a] hover:text-zinc-200"
                    }`}
                  >
                    {initial}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleCreateProject}
                className="flex h-9 w-full items-center justify-center rounded-xl border border-dashed border-[#333] bg-[#1c1c1c] text-zinc-500 transition hover:border-[#10a37f]/60 hover:text-zinc-200"
                title="Create project"
                aria-label="Create project"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="mx-2 my-3 h-px bg-[#272727]" />

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              C
            </div>
            <div className="space-y-1.5">
              {collapsedRecentChats.map((chat) => {
                const active = pathname === chat.href;

                return (
                  <Link
                    key={chat.id}
                    href={chat.href}
                    title={chat.title}
                    aria-label={chat.title}
                    className={`flex h-9 w-full items-center justify-center rounded-xl border transition-colors ${
                      active
                        ? "border-[#10a37f] bg-[#0f2a23] text-white"
                        : "border-[#2b2b2b] bg-[#202020] text-zinc-500 hover:border-[#3a3a3a] hover:text-zinc-300"
                    }`}
                  >
                    <MessageSquare size={13} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#272727] p-2.5">
            <Link
              href="/settings"
              className="flex items-center justify-center rounded-xl border border-[#2b2b2b] bg-[#202020] py-2 text-zinc-400 transition hover:border-[#3a3a3a] hover:text-zinc-200"
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={14} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="px-3 pb-1 pt-4">
            <div className="group mb-1.5 flex w-full items-center justify-between px-1 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Projects
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-[#2a2a2a]"
                  title="Create project"
                  aria-label="Create project"
                >
                  <Plus size={13} className="text-zinc-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setProjectsOpen((value) => !value)}
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

          <div className="flex-1 overflow-y-auto px-3">
            <button
              onClick={() => setChatsOpen((value) => !value)}
              className="mb-1.5 flex w-full items-center justify-between px-1 py-1"
              title="Recent chats"
              aria-label="Recent chats"
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

          <div className="border-t border-[#272727] p-2.5">
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-zinc-400 transition hover:bg-[#252525] hover:text-zinc-200"
            >
              <Settings size={14} />
              Settings
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
