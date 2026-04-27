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
  Settings,
} from "lucide-react";
import { Project, RecentChat, useAppStore } from "@/stores/app-store";
import { ModeToggle } from "./mode-toggle";

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
          ? "border-primary bg-accent text-foreground"
          : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
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
        className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-accent"
      >
        <MoreHorizontal size={13} />
      </button>
    </Link>
  );
}

function ChatItem({ chat, active }: { chat: RecentChat; active: boolean }) {
  return (
    <Link
      href={chat.href}
      className={`group flex items-start justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 ${
        active
          ? "border-l-2 border-primary bg-accent text-foreground"
          : "border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span className="flex min-w-0 gap-2">
        <MessageSquare
          size={13}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />

        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium leading-tight tracking-[-0.01em] text-foreground">
            {chat.title}
          </span>

          <span className="mt-0.5 block truncate text-[12px] leading-tight text-muted-foreground">
            {chat.preview}
          </span>
        </span>
      </span>

      <button
        onClick={(event) => event.preventDefault()}
        className="ml-1 mt-0.5 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-accent"
      >
        <MoreHorizontal size={13} className="text-muted-foreground" />
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
  const [recentsOpen, setRecentsOpen] = useState(false);

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
      className="flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200"
      style={{ width: collapsed ? "74px" : "15.5rem" }}
    >
      <div className="border-b border-sidebar-border p-2">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-full items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-ring hover:text-foreground"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight size={15} />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              onClick={handleCreateChat}
              className="flex items-center justify-center rounded-xl bg-primary px-3 py-1.5 text-[12px] font-semibold tracking-[-0.01em] text-primary-foreground transition hover:opacity-90"
              title="New Chat"
              aria-label="New Chat"
            >
              <span className="mr-1.5">New Chat</span>
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      {collapsed ? (
        <>
          <div className="flex flex-1 flex-col items-center gap-2 px-2 pt-3">
            <div className="group relative">
              <button
                onClick={handleCreateChat}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90"
                title="New Chat"
                aria-label="New Chat"
              >
                <Plus size={13} />
              </button>

              <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition group-hover:opacity-100">
                New Chat
              </span>
            </div>

            <div className="group relative">
              <button
                type="button"
                onClick={() => setRecentsOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground"
                title="Recents"
                aria-label="Recents"
              >
                <MessageSquare size={13} />
              </button>

              <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition group-hover:opacity-100">
                Recents
              </span>

              {recentsOpen && (
                <div className="absolute left-full top-0 z-20 ml-2 w-72 rounded-2xl border border-border bg-popover p-2 shadow-2xl">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Recent Chats
                  </p>

                  <div className="mt-1 space-y-1">
                    {collapsedRecentChats.length > 0 ? (
                      collapsedRecentChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={chat.href}
                          className={`block rounded-xl border px-2.5 py-2 transition ${
                            pathname === chat.href
                              ? "border-primary bg-primary/15"
                              : "border-transparent hover:border-border hover:bg-accent"
                          }`}
                        >
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {chat.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {chat.preview}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-xl border border-border bg-card px-2.5 py-2 text-[12px] text-muted-foreground">
                        No recent chats yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto border-t border-sidebar-border p-2.5">
            <div className="flex flex-col gap-2">
              <ModeToggle />
              <div className="group relative">
                <Link
                  href="/settings"
                  className="flex items-center justify-center rounded-xl border border-border bg-card py-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings size={14} />
                </Link>

                <span className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-lg transition group-hover:opacity-100">
                  Settings
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="px-3 pb-1 pt-4">
            <div className="group mb-1.5 flex w-full items-center justify-between px-1 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Projects
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-accent"
                  title="Create project"
                  aria-label="Create project"
                >
                  <Plus size={13} className="text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setProjectsOpen((value) => !value)}
                  className="rounded p-0.5 hover:bg-accent"
                >
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground transition-transform ${
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

          <div className="mx-3 my-2 h-px bg-sidebar-border" />

          <div className="flex-1 overflow-y-auto px-3">
            <button
              onClick={() => setChatsOpen((value) => !value)}
              className="mb-1.5 flex w-full items-center justify-between px-1 py-1"
              title="Recent chats"
              aria-label="Recent chats"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Recents
              </span>

              <ChevronDown
                size={13}
                className={`text-muted-foreground transition-transform ${
                  !chatsOpen ? "-rotate-90" : ""
                }`}
              />
            </button>

            {chatsOpen && (
              <div className="space-y-0.5">
                {recentChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    active={pathname === chat.href}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-sidebar-border p-2.5">
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Link
                href="/settings"
                className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Settings size={14} />
                Settings
              </Link>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
