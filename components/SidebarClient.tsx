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
import ForgeLogo from "./ForgeLogo";
import { useFeedback } from "./feedback-provider";
import { ModeToggle } from "./mode-toggle";
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
};

// ─── Shared style tokens ──────────────────────────────────────────────────────

const sidebarItemBase =
  "group flex items-center justify-between rounded-2xl px-2.5 py-2 text-sm font-medium transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-200 ease-out cursor-pointer";

const sidebarItemActive = {
  background: "var(--sidebar-active)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--sidebar-border)",
  color: "var(--sidebar-primary-foreground)",
};

const sidebarItemInactive = {
  background: "transparent",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "transparent",
  color: "var(--sidebar-foreground)",
  opacity: "0.72",
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
      showFeedback({
        type: "success",
        title: "Project renamed",
        description: `Updated to "${trimmed}"`,
      });
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
      showFeedback({
        type: "success",
        title: "Project deleted",
        description: `Removed "${project.name}"`,
      });
    } else {
      showFeedback({ type: "error", title: "Failed to delete project" });
    }
    setMenuOpen(false);
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2">
        <Folder
          size={14}
          className="shrink-0"
          style={{ color: "var(--sidebar-primary)" }}
        />
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate rounded-lg bg-transparent px-1 py-0 text-[12.5px] text-foreground outline-none"
          style={{
            border: "1px solid var(--sidebar-primary)",
            color: "var(--sidebar-foreground)",
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
            size={14}
            className="shrink-0"
            style={{
              color: active
                ? "var(--sidebar-primary)"
                : "var(--sidebar-foreground)",
              opacity: active ? 1 : 0.6,
            }}
          />
          <span
            className="block truncate text-base font-semibold leading-tight"
            style={{
              letterSpacing: "-0.01em",
              color: "var(--sidebar-foreground)",
            }}
          >
            {project.name}
          </span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="rounded-lg p-1 opacity-0 transition-[opacity,transform,color] duration-200 ease-out group-hover:opacity-100"
          style={{
            color: "var(--sidebar-foreground)",
            opacity: 0.42,
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={12} />
        </button>
      </Link>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsRenaming(true);
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-[background-color,color,transform] duration-150 ease-out"
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Pencil size={11} />
            Rename
          </button>

          <button
            onClick={async (e) => {
              e.preventDefault();
              await handleDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-[background-color,color,transform] duration-150 ease-out"
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(239,68,68,0.06)";
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
    showFeedback({
      type: "success",
      title: "Chat renamed",
      description: `Updated to "${trimmed}"`,
    });
    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    const result = await deleteChat(chat.id);
    if (result.success) {
      showFeedback({
        type: "success",
        title: "Chat deleted",
        description: `Removed "${chat.title}"`,
      });
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

  if (isRenaming) {
    return (
      <div className="flex items-start gap-2 rounded-2xl px-2.5 py-2">
        <MessageSquare
          size={14}
          className="mt-0.5 shrink-0"
          style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}
        />
        <input
          autoFocus
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate rounded-lg bg-transparent px-1 py-0 text-[12.5px] outline-none"
          style={{
            border: "1px solid var(--sidebar-primary)",
            color: "var(--sidebar-foreground)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href={`/c/${chat.id}`}
        className={sidebarItemBase}
        style={{
          ...(active ? sidebarItemActive : sidebarItemInactive),
          borderBottomColor: "var(--border)",
          marginBottom: "4px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background =
              "var(--sidebar-accent)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--sidebar-border)";
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
            (e.currentTarget as HTMLElement).style.opacity = "0.9";
          }
        }}
      >
        <span className="flex min-w-0 gap-2">
          <MessageSquare
            size={14}
            className="mt-0.5 shrink-0"
            style={{
              color: active
                ? "var(--sidebar-primary)"
                : "var(--sidebar-foreground)",
              opacity: active ? 1 : 0.6,
            }}
          />
          <span
            className="block truncate text-base font-semibold leading-tight"
            style={{
              letterSpacing: "-0.01em",
              color: "var(--sidebar-foreground)",
            }}
          >
            {chat.title}
          </span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="rounded-lg p-1 opacity-0 transition-[opacity,transform,color] duration-200 ease-out group-hover:opacity-100"
          style={{
            color: "var(--sidebar-foreground)",
            opacity: 0.42,
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={12} />
        </button>
      </Link>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsRenaming(true);
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-[background-color,color,transform] duration-150 ease-out"
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--accent)";
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
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-[background-color,color,transform] duration-150 ease-out"
            style={{ color: "var(--destructive)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--destructive)";
              (e.currentTarget as HTMLElement).style.opacity = "0.08";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.opacity = "1";
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
      showFeedback({
        type: "success",
        title: "Project created",
        description: `Added "${result.project?.name}"`,
      });
      setProjectsOpen(true);
    } else {
      showFeedback({ type: "error", title: "Failed to create project" });
    }
  };

  const handleCreateChat = () => {
    window.setTimeout(() => {
      router.push("/");
    }, 0);
  };

  const handleOpenSearch = () => {
    window.setTimeout(() => {
      router.push("/search");
    }, 0);
  };

  const collapsedRecentChats = recentChats.slice(0, 6);

  const sectionLabel = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "var(--sidebar-foreground)",
    opacity: 0.9,
  };

  return (
    <aside
      className="flex h-screen shrink-0 flex-col transition-[width] duration-200"
      style={{
        width: collapsed ? "64px" : "15rem",
        background: "var(--card)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* ── Top bar ── */}
      <div
        className="p-2 pb-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-full items-center justify-center rounded-2xl"
          >
            <ChevronRight size={13} />
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sidebar-accent border border-sidebar-border">
                  <ForgeLogo className="h-5 w-5 text-sidebar-foreground" />
                </span>
                <span
                  className="text-sm font-semibold tracking-[-0.02em]"
                  style={{ color: "var(--sidebar-foreground)" }}
                >
                  Forge
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="rounded-2xl p-2"
              >
                <ChevronLeft size={13} />
              </button>
            </div>

            <div className="flex w-full gap-2">
              <button
                onClick={handleCreateChat}
                className="flex-1 rounded-2xl px-3 py-2 flex items-center justify-center"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                <Plus size={14} className="mr-1.5" />
                New chat
              </button>
              <button
                onClick={handleOpenSearch}
                className="h-10 w-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: "var(--accent)",
                  border: "1px solid var(--border)",
                  color: "var(--sidebar-foreground)",
                }}
              >
                <Search size={14} />
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
                className="flex h-9 w-9 items-center justify-center rounded-2xl transition-[background-color,color,opacity,transform,box-shadow] duration-200 ease-out hover:opacity-95 active:scale-[0.97] cursor-pointer"
                style={{
                  background: "#16a34a",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                }}
                title="New Chat"
              >
                <Plus size={13} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                New Chat
              </span>
            </div>

            <div className="group relative">
              <button
                type="button"
                onClick={handleOpenSearch}
                className="flex h-9 w-9 items-center justify-center rounded-2xl transition-[background-color,color,opacity,transform] duration-200 ease-out cursor-pointer"
                style={{
                  background: "var(--accent)",
                  border: "1px solid var(--border)",
                  color: "var(--sidebar-foreground)",
                  opacity: 0.52,
                }}
                title="Search"
              >
                <Search size={13} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                Search
              </span>
            </div>

            <div className="group relative">
              <button
                type="button"
                onClick={() => setRecentsOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl transition-[background-color,color,opacity,transform] duration-200 ease-out cursor-pointer"
                style={{
                  background: "var(--accent)",
                  border: "1px solid var(--border)",
                  color: "var(--sidebar-foreground)",
                  opacity: 0.52,
                }}
                title="Recents"
              >
                <MessageSquare size={13} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                Recents
              </span>

              {recentsOpen && (
                <div
                  className="absolute left-full top-0 z-20 ml-2.5 w-72 rounded-2xl p-2 shadow-2xl"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
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
                          className="block rounded-2xl px-2.5 py-2 transition-[background-color,border-color,transform] duration-150 ease-out"
                          style={
                            pathname === `/c/${chat.id}`
                              ? {
                                  background: "var(--sidebar-accent)",
                                  border: "1px solid var(--sidebar-primary)",
                                }
                              : {}
                          }
                        >
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: "var(--sidebar-foreground)" }}
                          >
                            {chat.title}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div
                        className="rounded-xl px-2.5 py-2.5 text-[12px]"
                        style={{
                          color: "var(--sidebar-foreground)",
                          opacity: 0.5,
                        }}
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
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex flex-col gap-2">
              <ModeToggle />
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors"
                style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}
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
                  className="rounded-lg p-1 opacity-0 transition-[opacity,transform,color] duration-200 ease-out group-hover:opacity-100"
                  style={{
                    color: "var(--sidebar-foreground)",
                    opacity: 0.42,
                    cursor: "pointer",
                  }}
                  title="Create project"
                >
                  <Plus size={11} />
                </button>

                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  className="rounded-lg p-1 transition-[background-color,color,opacity,transform] duration-200 ease-out cursor-pointer"
                  style={{ color: "var(--sidebar-foreground)", opacity: 0.64 }}
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
                  Array.from({ length: initialProjects.length || 4 }).map(
                    (_, i) => (
                      <div
                        key={`project-skeleton-${i}`}
                        className="h-8 animate-pulse rounded-2xl"
                        style={{ background: "var(--muted)", opacity: 0.12 }}
                      />
                    ),
                  )
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
                    className="rounded-2xl px-2.5 py-2 text-[12px]"
                    style={{
                      color: "var(--sidebar-foreground)",
                      opacity: 0.48,
                    }}
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
            style={{ background: "var(--border)" }}
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
                style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}
              />
            </button>

            {chatsOpen && (
              <div className="space-y-0.5">
                {isBooting ? (
                  Array.from({ length: recentChats.length || 5 }).map(
                    (_, i) => (
                      <div
                        key={`chat-skeleton-${i}`}
                        className="h-11 animate-pulse rounded-2xl"
                        style={{ background: "var(--muted)", opacity: 0.12 }}
                      />
                    ),
                  )
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
                    className="rounded-2xl px-2.5 py-2 text-[12px]"
                    style={{
                      color: "var(--sidebar-foreground)",
                      opacity: 0.48,
                    }}
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
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Link
                href="/settings"
                className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] transition-[background-color,color,opacity,transform] duration-200 ease-out cursor-pointer"
                style={{ color: "var(--sidebar-foreground)", opacity: 0.68 }}
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
