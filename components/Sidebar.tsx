"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Trash2,
  Pencil,
} from "lucide-react";
import { Project, RecentChat, useAppStore } from "@/stores/app-store";
import { ModeToggle } from "./mode-toggle";
import { useFeedback } from "./feedback-provider";

// ─── ProjectItem ──────────────────────────────────────────────────────────────

function ProjectItem({
  project,
  active,
}: {
  project: Project;
  active: boolean;
}) {
  const { showFeedback } = useFeedback();
  const renameProject = useAppStore((store) => store.renameProject);
  const deleteProject = useAppStore((store) => store.deleteProject);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRename = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showFeedback({
        type: "error",
        title: "Project name is required",
      });
      setNewName(project.name);
      setIsRenaming(false);
      setMenuOpen(false);
      return;
    }

    renameProject(project.id, trimmed);
    showFeedback({
      type: "success",
      title: "Project renamed",
      description: `Updated to \"${trimmed}\"`,
    });

    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleDelete = () => {
    deleteProject(project.id);
    showFeedback({
      type: "success",
      title: "Project deleted",
      description: `Removed \"${project.name}\"`,
    });
    setMenuOpen(false);
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-[7px]">
        <Folder size={12} className="shrink-0 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate bg-background px-1 py-0 text-[13px] outline-none ring-1 ring-primary/40 rounded"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href={project.href}
        className={`group flex items-center justify-between rounded-lg px-2.5 py-[7px] text-[13px] transition-all duration-150 ${
          active
            ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md transition-colors ${
              active
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
          >
            <Folder size={12} />
          </span>
          <span className="truncate font-medium tracking-[-0.01em]">
            {project.name}
          </span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
        >
          <MoreHorizontal size={13} />
        </button>
      </Link>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-popover shadow-lg z-50">
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsRenaming(true);
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-accent transition-colors"
          >
            <Pencil size={12} />
            Rename
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ChatItem ─────────────────────────────────────────────────────────────────

function ChatItem({ chat, active }: { chat: RecentChat; active: boolean }) {
  const { showFeedback } = useFeedback();
  const renameChat = useAppStore((store) => store.renameChat);
  const deleteChat = useAppStore((store) => store.deleteChat);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRename = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      showFeedback({
        type: "error",
        title: "Chat title is required",
      });
      setNewTitle(chat.title);
      setIsRenaming(false);
      setMenuOpen(false);
      return;
    }

    renameChat(chat.id, trimmed);
    showFeedback({
      type: "success",
      title: "Chat renamed",
      description: `Updated to \"${trimmed}\"`,
    });

    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleDelete = () => {
    deleteChat(chat.id);
    showFeedback({
      type: "success",
      title: "Chat deleted",
      description: `Removed \"${chat.title}\"`,
    });
    setMenuOpen(false);
  };

  if (isRenaming) {
    return (
      <div className="flex items-start gap-2 rounded-lg px-2.5 py-2">
        <MessageSquare
          size={12}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
        <input
          autoFocus
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate bg-background px-1 py-0 text-[13px] outline-none ring-1 ring-primary/40 rounded"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href={chat.href}
        className={`group flex items-start justify-between rounded-lg px-2.5 py-2 transition-all duration-150 ${
          active
            ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <span className="flex min-w-0 gap-2">
          <MessageSquare
            size={12}
            className={`mt-0.5 shrink-0 transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          />

          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-tight tracking-[-0.01em] text-foreground">
              {chat.title}
            </span>

            <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
              {chat.preview}
            </span>
          </span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="ml-1 mt-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
        >
          <MoreHorizontal size={13} className="text-muted-foreground" />
        </button>
      </Link>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-popover shadow-lg z-50">
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsRenaming(true);
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-accent transition-colors"
          >
            <Pencil size={12} />
            Rename
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { showFeedback } = useFeedback();
  const pathname = usePathname();
  const router = useRouter();

  const projects = useAppStore((store) => store.projects);
  const recentChats = useAppStore((store) => store.recentChats);
  const createProject = useAppStore((store) => store.createProject);

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const handleCreateProject = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const project = createProject();
    showFeedback({
      type: "success",
      title: "Project created",
      description: `Added \"${project.name}\"`,
    });
    setProjectsOpen(true);
  };

  const handleCreateChat = () => {
    router.push("/");
  };

  const handleOpenSearch = () => {
    router.push("/search");
  };

  const collapsedRecentChats = recentChats.slice(0, 6);

  return (
    <aside
      className="flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200"
      style={{ width: collapsed ? "74px" : "15.5rem" }}
    >
      {/* ── Top bar ── */}
      <div className="border-b border-sidebar-border p-2">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-full items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleOpenSearch}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Search (Cmd/Ctrl+K)"
                aria-label="Search"
              >
                <Search size={13} />
              </button>

              <button
                onClick={handleCreateChat}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[12px] font-semibold tracking-[-0.01em] text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                title="New Chat"
                aria-label="New Chat"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>New Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Collapsed state ── */}
      {collapsed ? (
        <>
          <div className="flex flex-1 flex-col items-center gap-2 px-2 pt-3">
            {/* New chat icon */}
            <div className="group relative">
              <button
                onClick={handleCreateChat}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.97]"
                title="New Chat"
                aria-label="New Chat"
              >
                <Plus size={13} />
              </button>

              <span className="pointer-events-none absolute left-full top-1/2 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-50">
                New Chat
              </span>
            </div>

            {/* Recents icon */}
            <div className="group relative">
              <button
                type="button"
                onClick={handleOpenSearch}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Search"
                aria-label="Search"
              >
                <Search size={13} />
              </button>

              <span className="pointer-events-none absolute left-full top-1/2 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-50">
                Search
              </span>
            </div>

            {/* Recents icon */}
            <div className="group relative">
              <button
                type="button"
                onClick={() => setRecentsOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Recents"
                aria-label="Recents"
              >
                <MessageSquare size={13} />
              </button>

              <span className="pointer-events-none absolute left-full top-1/2 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-50">
                Recents
              </span>

              {/* Recents flyout */}
              {recentsOpen && (
                <div className="absolute left-full top-0 z-20 ml-2.5 w-72 rounded-2xl border border-border bg-popover p-2 shadow-xl">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Recent Chats
                  </p>

                  <div className="mt-1 space-y-0.5">
                    {collapsedRecentChats.length > 0 ? (
                      collapsedRecentChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={chat.href}
                          className={`block rounded-xl px-2.5 py-2 transition-colors ${
                            pathname === chat.href
                              ? "bg-primary/10 ring-1 ring-primary/20"
                              : "hover:bg-accent"
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
                      <div className="rounded-xl border border-border bg-card px-2.5 py-2.5 text-[12px] text-muted-foreground">
                        No recent chats yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer (collapsed) */}
          <div className="mt-auto border-t border-sidebar-border p-2.5">
            <div className="flex flex-col gap-2">
              <ModeToggle />
              <div className="group relative">
                <Link
                  href="/settings"
                  className="flex items-center justify-center rounded-xl border border-border bg-card py-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings size={14} />
                </Link>

                <span className="pointer-events-none absolute right-full top-1/2 mr-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Settings
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Projects section ── */}
          <div className="px-3 pb-1 pt-4">
            <div className="group mb-1.5 flex w-full items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Projects
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                  title="Create project"
                  aria-label="Create project"
                >
                  <Plus size={12} className="text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setProjectsOpen((value) => !value)}
                  className="rounded p-1 hover:bg-accent"
                >
                  <ChevronDown
                    size={12}
                    className={`text-muted-foreground transition-transform duration-200 ${
                      !projectsOpen ? "-rotate-90" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {projectsOpen && (
              <div className="space-y-0.5">
                {isBooting
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`project-skeleton-${index}`}
                        className="h-8 animate-pulse rounded-lg bg-muted/60"
                      />
                    ))
                  : projects.map((project) => (
                      <ProjectItem
                        key={project.id}
                        project={project}
                        active={pathname === project.href}
                      />
                    ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-3 my-2 h-px bg-sidebar-border" />

          {/* ── Recents section ── */}
          <div className="flex-1 overflow-y-auto px-3">
            <button
              onClick={() => setChatsOpen((value) => !value)}
              className="mb-1.5 flex w-full items-center justify-between px-1"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Recents
              </span>

              <ChevronDown
                size={12}
                className={`text-muted-foreground transition-transform duration-200 ${
                  !chatsOpen ? "-rotate-90" : ""
                }`}
              />
            </button>

            {chatsOpen && (
              <div className="space-y-0.5">
                {isBooting
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`chat-skeleton-${index}`}
                        className="h-11 animate-pulse rounded-lg bg-muted/60"
                      />
                    ))
                  : recentChats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        active={pathname === chat.href}
                      />
                    ))}
              </div>
            )}
          </div>

          {/* Footer (expanded) */}
          <div className="border-t border-sidebar-border p-2.5">
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Link
                href="/settings"
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Settings size={13} />
                Settings
              </Link>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
