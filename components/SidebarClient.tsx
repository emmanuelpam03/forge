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
import { ModeToggle } from "./mode-toggle";
import { useFeedback } from "./feedback-provider";
import {
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/actions/projects";
import { deleteChat } from "@/lib/actions/chats";

export type ProjectItemData = {
  id: string;
  name: string;
};

export type ChatItemData = {
  id: string;
  title: string;
  summary?: string | null;
};

// ─── Shared style tokens ──────────────────────────────────────────────────────

const sidebarItemBase =
  "group flex items-center justify-between rounded-xl px-2.5 py-2 text-[12.5px] transition-all duration-150 cursor-pointer";

const sidebarItemActive = {
  background: "rgba(251,191,36,0.1)",
  border: "1px solid rgba(251,191,36,0.2)",
  color: "rgba(255,255,255,0.9)",
};

const sidebarItemInactive = {
  background: "transparent",
  border: "1px solid transparent",
  color: "rgba(255,255,255,0.4)",
};

// ─── ProjectItem ──────────────────────────────────────────────────────────────

function ProjectItem({
  project,
  active,
}: {
  project: ProjectItemData;
  active: boolean;
}) {
  const { showFeedback } = useFeedback();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showFeedback({ type: "error", title: "Project name is required" });
      setNewName(project.name);
      setIsRenaming(false);
      setMenuOpen(false);
      return;
    }
    const result = await updateProject(project.id, { name: trimmed });
    if (result.success) {
      showFeedback({ type: "success", title: "Project renamed", description: `Updated to "${trimmed}"` });
    } else {
      showFeedback({ type: "error", title: "Failed to rename project" });
      setNewName(project.name);
    }
    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    const result = await deleteProject(project.id);
    if (result.success) {
      showFeedback({ type: "success", title: "Project deleted", description: `Removed "${project.name}"` });
    } else {
      showFeedback({ type: "error", title: "Failed to delete project" });
    }
    setMenuOpen(false);
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-2.5 py-2">
        <Folder size={11} className="shrink-0" style={{ color: "rgba(251,191,36,0.6)" }} />
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate rounded-lg bg-transparent px-1 py-0 text-[12.5px] text-foreground outline-none"
          style={{
            border: "1px solid rgba(251,191,36,0.35)",
            color: "rgba(255,255,255,0.9)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href={`/p/${project.id}`}
        className={sidebarItemBase}
        style={active ? sidebarItemActive : sidebarItemInactive}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Folder
            size={11}
            className="shrink-0"
            style={{ color: active ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.3)" }}
          />
          <span
            className="truncate font-medium"
            style={{ letterSpacing: "-0.01em" }}
          >
            {project.name}
          </span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <MoreHorizontal size={12} />
        </button>
      </Link>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{
            background: "rgba(20,18,16,0.96)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsRenaming(true);
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "rgba(255,255,255,0.7)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Pencil size={11} />
            Rename
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "rgba(239,68,68,0.85)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Trash2 size={11} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ChatItem ─────────────────────────────────────────────────────────────────

function ChatItem({
  chat,
  active,
  onDelete,
}: {
  chat: ChatItemData;
  active: boolean;
  onDelete?: (chatId: string) => void;
}) {
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRename = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      showFeedback({ type: "error", title: "Chat title is required" });
      setNewTitle(chat.title);
      setIsRenaming(false);
      setMenuOpen(false);
      return;
    }
    showFeedback({ type: "success", title: "Chat renamed", description: `Updated to "${trimmed}"` });
    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    const result = await deleteChat(chat.id);
    if (result.success) {
      showFeedback({ type: "success", title: "Chat deleted", description: `Removed "${chat.title}"` });
      setMenuOpen(false);
      onDelete?.(chat.id);
      if (active) {
        await router.push("/");
      } else {
        router.refresh();
      }
      return;
    }
    showFeedback({ type: "error", title: "Failed to delete chat" });
  };

  const preview = chat.summary || "No summary yet";

  if (isRenaming) {
    return (
      <div className="flex items-start gap-2 rounded-xl px-2.5 py-2">
        <MessageSquare size={11} className="mt-0.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
        <input
          autoFocus
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate rounded-lg bg-transparent px-1 py-0 text-[12.5px] outline-none"
          style={{
            border: "1px solid rgba(251,191,36,0.35)",
            color: "rgba(255,255,255,0.9)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href={`/c/${chat.id}`}
        className={sidebarItemBase + " items-start"}
        style={active ? sidebarItemActive : sidebarItemInactive}
      >
        <span className="flex min-w-0 gap-2">
          <MessageSquare
            size={11}
            className="mt-0.5 shrink-0"
            style={{ color: active ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.3)" }}
          />
          <span className="min-w-0">
            <span
              className="block truncate text-[12.5px] font-medium leading-tight"
              style={{ letterSpacing: "-0.01em", color: "rgba(255,255,255,0.82)" }}
            >
              {chat.title}
            </span>
            <span
              className="mt-0.5 block truncate text-[11px] leading-tight"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              {preview}
            </span>
          </span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="ml-1 mt-0.5 rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <MoreHorizontal size={12} />
        </button>
      </Link>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{
            background: "rgba(20,18,16,0.96)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsRenaming(true);
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "rgba(255,255,255,0.7)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Pencil size={11} />
            Rename
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "rgba(239,68,68,0.85)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Trash2 size={11} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SidebarClient ────────────────────────────────────────────────────────────

export function SidebarClient({
  initialProjects,
  initialChats,
}: {
  initialProjects: ProjectItemData[];
  initialChats: ChatItemData[];
}) {
  const { showFeedback } = useFeedback();
  const pathname = usePathname();
  const router = useRouter();

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [recentChats, setRecentChats] = useState(initialChats);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const handleCreateProject = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const result = await createProject();
    if (result.success) {
      showFeedback({ type: "success", title: "Project created", description: `Added "${result.project?.name}"` });
      setProjectsOpen(true);
    } else {
      showFeedback({ type: "error", title: "Failed to create project" });
    }
  };

  const handleCreateChat = () => {
    window.setTimeout(() => { router.push("/"); }, 0);
  };

  const handleOpenSearch = () => {
    window.setTimeout(() => { router.push("/search"); }, 0);
  };

  const collapsedRecentChats = recentChats.slice(0, 6);

  const sectionLabel = {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.22)",
  };

  return (
    <aside
      className="flex h-screen shrink-0 flex-col transition-[width] duration-200"
      style={{
        width: collapsed ? "64px" : "15rem",
        background: "rgba(10,9,8,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Top bar ── */}
      <div
        className="p-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-full items-center justify-center rounded-xl transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.4)",
            }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={13} />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg p-2 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={13} />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenSearch}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.4)",
                }}
                title="Search"
              >
                <Search size={12} />
              </button>

              <button
                onClick={handleCreateChat}
                className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  color: "#1a1208",
                  letterSpacing: "-0.01em",
                  boxShadow: "0 2px 8px rgba(251,191,36,0.25)",
                }}
                title="New Chat"
              >
                <Plus size={11} strokeWidth={2.5} />
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
            <div className="group relative">
              <button
                onClick={handleCreateChat}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:opacity-90 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  color: "#1a1208",
                  boxShadow: "0 2px 8px rgba(251,191,36,0.2)",
                }}
                title="New Chat"
              >
                <Plus size={13} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "rgba(20,18,16,0.96)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                New Chat
              </span>
            </div>

            <div className="group relative">
              <button
                type="button"
                onClick={handleOpenSearch}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.4)",
                }}
                title="Search"
              >
                <Search size={13} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "rgba(20,18,16,0.96)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Search
              </span>
            </div>

            <div className="group relative">
              <button
                type="button"
                onClick={() => setRecentsOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.4)",
                }}
                title="Recents"
              >
                <MessageSquare size={13} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "rgba(20,18,16,0.96)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Recents
              </span>

              {recentsOpen && (
                <div
                  className="absolute left-full top-0 z-20 ml-2.5 w-72 rounded-2xl p-2 shadow-2xl"
                  style={{
                    background: "rgba(14,12,10,0.97)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <p className="px-2 py-1.5" style={sectionLabel}>
                    Recent Chats
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {collapsedRecentChats.length > 0 ? (
                      collapsedRecentChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={`/c/${chat.id}`}
                          className="block rounded-xl px-2.5 py-2 transition-colors"
                          style={
                            pathname === `/c/${chat.id}`
                              ? { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }
                              : {}
                          }
                        >
                          <p
                            className="truncate text-[12.5px] font-medium"
                            style={{ color: "rgba(255,255,255,0.85)" }}
                          >
                            {chat.title}
                          </p>
                          <p
                            className="truncate text-[11px]"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            {chat.summary || "No summary"}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div
                        className="rounded-xl px-2.5 py-2.5 text-[12px]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        No chats yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="mt-auto p-2.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex flex-col gap-2">
              <ModeToggle />
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <Settings size={13} />
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Projects section ── */}
          <div className="px-3 pb-1 pt-4">
            <div className="group mb-2 flex w-full items-center justify-between px-1">
              <span style={sectionLabel}>Projects</span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  title="Create project"
                >
                  <Plus size={11} />
                </button>

                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  className="rounded-lg p-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${!projectsOpen ? "-rotate-90" : ""}`}
                  />
                </button>
              </div>
            </div>

            {projectsOpen && (
              <div className="space-y-0.5">
                {isBooting ? (
                  Array.from({ length: initialProjects.length || 4 }).map((_, i) => (
                    <div
                      key={`project-skeleton-${i}`}
                      className="h-8 animate-pulse rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    />
                  ))
                ) : initialProjects.length > 0 ? (
                  initialProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      active={
                        pathname?.startsWith(`/projects/${project.id}`) ||
                        pathname === `/p/${project.id}`
                      }
                    />
                  ))
                ) : (
                  <div
                    className="rounded-xl px-2.5 py-2 text-[12px]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No projects yet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="mx-3 my-2 h-px"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />

          {/* ── Recents section ── */}
          <div className="flex-1 overflow-y-auto px-3">
            <button
              onClick={() => setChatsOpen((v) => !v)}
              className="mb-2 flex w-full items-center justify-between px-1"
            >
              <span style={sectionLabel}>Recents</span>
              <ChevronDown
                size={11}
                className={`transition-transform duration-200 ${!chatsOpen ? "-rotate-90" : ""}`}
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
            </button>

            {chatsOpen && (
              <div className="space-y-0.5">
                {isBooting ? (
                  Array.from({ length: recentChats.length || 5 }).map((_, i) => (
                    <div
                      key={`chat-skeleton-${i}`}
                      className="h-11 animate-pulse rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    />
                  ))
                ) : recentChats.length > 0 ? (
                  recentChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      active={pathname === `/c/${chat.id}`}
                      onDelete={(chatId) =>
                        setRecentChats((current) =>
                          current.filter((item) => item.id !== chatId),
                        )
                      }
                    />
                  ))
                ) : (
                  <div
                    className="rounded-xl px-2.5 py-2 text-[12px]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No chats yet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-2.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Link
                href="/settings"
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
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