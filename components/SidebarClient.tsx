"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CircleHelp,
  Image as ImageIcon,
  Plus,
  LogIn,
  Search,
  ChevronDown,
  PanelLeft,
  Folder,
  MessageSquare,
  MoreHorizontal,
  Settings,
  LogOut,
  Trash2,
  Pencil,
  UserCircle2,
} from "lucide-react";
import ForgeLogo from "./ForgeLogo";
import { useFeedback } from "./feedback-provider";
import { useAuth } from "./auth-provider";
import {
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/actions/projects";
import { deleteChat, getRecentChatsPage } from "@/lib/actions/chats";
import { isGuestChatId } from "@/lib/guest-chat";

export type ProjectItemData = {
  id: string;
  name: string;
};

export type ChatItemData = {
  id: string;
  title: string;
  lastMessageAt: string;
};

const RECENT_CHAT_PAGE_SIZE = 20;

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
    if (isGuestChatId(chat.id)) {
      onDelete?.(chat.id);
      setMenuOpen(false);
      if (active) {
        await router.push("/");
      }
      return;
    }

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
  const recentsScrollRef = useRef<HTMLDivElement | null>(null);
  const recentsPopoverScrollRef = useRef<HTMLDivElement | null>(null);
  const recentsLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const recentsPopoverLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut } = useAuth();

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [recentsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [projects, setProjects] = useState(initialProjects);
  const [recentChats, setRecentChats] = useState(initialChats);
  const [hasMoreRecentChats, setHasMoreRecentChats] = useState(
    initialChats.length === RECENT_CHAT_PAGE_SIZE,
  );
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);

  const loadMoreRecentChats = useCallback(async () => {
    if (!user || isLoadingMoreChats || !hasMoreRecentChats) {
      return;
    }

    const lastChat = recentChats[recentChats.length - 1];
    if (!lastChat) {
      setHasMoreRecentChats(false);
      return;
    }

    setIsLoadingMoreChats(true);
    try {
      const result = await getRecentChatsPage({
        limit: RECENT_CHAT_PAGE_SIZE,
        cursor: {
          id: lastChat.id,
          lastMessageAt: new Date(lastChat.lastMessageAt),
        },
      });

      setRecentChats((prev) => {
        const seenIds = new Set(prev.map((chat) => chat.id));
        const nextChats = result.chats.filter((chat) => !seenIds.has(chat.id));

        return [
          ...prev,
          ...nextChats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            lastMessageAt: chat.lastMessageAt.toISOString(),
          })),
        ];
      });
      setHasMoreRecentChats(result.hasMore);
    } finally {
      setIsLoadingMoreChats(false);
    }
  }, [user, hasMoreRecentChats, isLoadingMoreChats, recentChats]);

  useEffect(() => {
    if (!chatsOpen || collapsed) {
      return;
    }

    const root = recentsScrollRef.current;
    const target = recentsLoadMoreRef.current;
    if (!root || !target || !hasMoreRecentChats || isLoadingMoreChats) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }
        void loadMoreRecentChats();
      },
      {
        root,
        rootMargin: "160px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    chatsOpen,
    collapsed,
    hasMoreRecentChats,
    isLoadingMoreChats,
    loadMoreRecentChats,
  ]);

  useEffect(() => {
    if (!collapsed || !recentsOpen) {
      return;
    }

    const root = recentsPopoverScrollRef.current;
    const target = recentsPopoverLoadMoreRef.current;
    if (!root || !target || !hasMoreRecentChats || isLoadingMoreChats) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        void loadMoreRecentChats();
      },
      {
        root,
        rootMargin: "160px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    collapsed,
    recentsOpen,
    hasMoreRecentChats,
    isLoadingMoreChats,
    loadMoreRecentChats,
  ]);

  // Optimistic chat creation: listen for chat:created and chat:confirmed events
  useEffect(() => {
    function handleChatCreated(e: CustomEvent) {
      const { id, title } = e.detail;
      setRecentChats((prev) => [
        { id, title, lastMessageAt: new Date().toISOString() },
        ...prev.filter((chat) => chat.id !== id),
      ]);
    }
    function handleChatConfirmed(e: CustomEvent) {
      const { tempId, id, title } = e.detail;
      setRecentChats((prev) => {
        // Replace temp chat with real chat
        const filtered = prev.filter((c) => c.id !== tempId);
        return [
          { id, title, lastMessageAt: new Date().toISOString() },
          ...filtered.filter((chat) => chat.id !== id),
        ];
      });
    }
    function handleTitleUpdated(e: CustomEvent) {
      const { chatId, title } = e.detail;
      if (!chatId || typeof title !== "string") {
        return;
      }
      setRecentChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title } : c)),
      );
    }
    window.addEventListener("chat:created", handleChatCreated as EventListener);
    window.addEventListener("chat:confirmed", handleChatConfirmed as EventListener);
    window.addEventListener("chat:title-updated", handleTitleUpdated as EventListener);
    return () => {
      window.removeEventListener("chat:created", handleChatCreated as EventListener);
      window.removeEventListener("chat:confirmed", handleChatConfirmed as EventListener);
      window.removeEventListener("chat:title-updated", handleTitleUpdated as EventListener);
    };
  }, []);

  // Title-updates EventSource removed by request — rely on window events only

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  // Listen for global sidebar toggle events from the shell/navbar
  useEffect(() => {
    function handleToggle() {
      setCollapsed((v) => !v);
    }
    window.addEventListener("sidebar:toggle", handleToggle);
    return () => window.removeEventListener("sidebar:toggle", handleToggle);
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      const menu = document.getElementById("sidebar-profile-menu");
      const trigger = document.getElementById("sidebar-profile-trigger");
      if (menu?.contains(target) || trigger?.contains(target)) {
        return;
      }
      setProfileMenuOpen(false);
    }

    document.addEventListener("click", handleDocumentClick as unknown as EventListener);
    return () => document.removeEventListener("click", handleDocumentClick as unknown as EventListener);
  }, []);

  // Broadcast collapsed state so other UI (navbar) can adapt
  useEffect(() => {
    try {
      // store on window for initial read
      // @ts-expect-error -- we intentionally add a window-scoped debug var
      window.__FORGE_SIDEBAR_COLLAPSED = collapsed;
      window.dispatchEvent(
        new CustomEvent("sidebar:change", { detail: { collapsed } })
      );
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    if (user) {
      setRecentChats(initialChats);
      return;
    }
    setRecentChats((prev) => prev.filter((chat) => isGuestChatId(chat.id)));
  }, [initialChats, user]);

  const handleCreateProject = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      showFeedback({
        type: "info",
        title: "Log in to create projects",
        description: "Projects are saved to your account after you sign in.",
      });
      router.push("/login");
      return;
    }
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
          <div className="flex items-center gap-2">
            <div className="group relative">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl"
                aria-label="Expand sidebar"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full">
                  <ForgeLogo className="h-5 w-5 text-sidebar-foreground" />
                </span>
              </button>

              <button
                onClick={() => setCollapsed(false)}
                className="absolute -inset-1 flex items-center justify-center rounded-2xl bg-card/95 border border-border text-sidebar-foreground opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100"
                aria-hidden
              >
                <PanelLeft size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sidebar-accent border border-sidebar-border">
                  <ForgeLogo className="h-5 w-5 text-sidebar-foreground" />
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="rounded-2xl p-2"
                aria-label="Toggle sidebar"
              >
                <PanelLeft size={13} />
              </button>
            </div>

            <div className="ml-2 space-y-1.5 px-1">
              <button
                onClick={handleCreateChat}
                className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium"
                style={{
                  background: "var(--accent)",
                  border: "1px solid var(--border)",
                  color: "var(--sidebar-foreground)",
                  opacity: 0.96,
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background/80">
                  <Plus size={13} />
                </span>
                <span>New chat</span>
              </button>

              <Link
                href="/search"
                className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors"
                style={{
                  color: "var(--sidebar-foreground)",
                  opacity: 0.88,
                }}
              >
                <Search size={14} className="shrink-0" />
                <span>Search chats</span>
              </Link>

              <Link
                href="/images"
                className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors"
                style={{
                  color: "var(--sidebar-foreground)",
                  opacity: 0.88,
                }}
              >
                <ImageIcon size={14} className="shrink-0" />
                <span>Images</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {collapsed && (
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
                <Plus size={14} />
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
                <Search size={14} />
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
                onClick={() => router.push('/images')}
                className="flex h-9 w-9 items-center justify-center rounded-2xl transition-[background-color,color,opacity,transform] duration-200 ease-out cursor-pointer"
                style={{
                  background: "var(--accent)",
                  border: "1px solid var(--border)",
                  color: "var(--sidebar-foreground)",
                  opacity: 0.52,
                }}
                title="Images"
              >
                <ImageIcon size={14} />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                Images
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
                  <div
                    ref={recentsPopoverScrollRef}
                    className="mt-1 max-h-72 space-y-0.5 overflow-y-auto pr-1"
                  >
                    {recentChats.length > 0 ? (
                      <>
                        {recentChats.map((chat) => (
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
                        ))}
                        {hasMoreRecentChats && (
                          <div
                            ref={recentsPopoverLoadMoreRef}
                            className="px-2.5 py-2"
                          >
                            <div className="h-8 rounded-2xl" />
                          </div>
                        )}
                        {isLoadingMoreChats && (
                          <div
                            className="rounded-xl px-2.5 py-2.5 text-[12px]"
                            style={{
                              color: "var(--sidebar-foreground)",
                              opacity: 0.5,
                            }}
                          >
                            Loading more chats...
                          </div>
                        )}
                      </>
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
            <div className="relative flex items-center justify-center">
              <button
                id="sidebar-profile-trigger"
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-colors hover:bg-accent"
                aria-label="Open profile menu"
              >
                <UserCircle2 size={18} />
              </button>

              {profileMenuOpen && (
                <div
                  id="sidebar-profile-menu"
                  className="absolute bottom-0 left-full z-50 ml-2 w-52 rounded-2xl border border-border bg-card p-2 shadow-2xl"
                >
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Profile
                    </div>

                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors hover:bg-accent"
                      style={{ color: "var(--sidebar-foreground)" }}
                    >
                      <Settings size={13} />
                      Settings
                    </Link>

                    <Link
                      href="/help"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors hover:bg-accent"
                      style={{ color: "var(--sidebar-foreground)" }}
                    >
                      <CircleHelp size={13} />
                      Help
                    </Link>

                    <Link
                      href="/settings/billing"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors hover:bg-accent"
                      style={{ color: "var(--sidebar-foreground)" }}
                    >
                      <ArrowUpRight size={13} />
                      Plans & pricing
                    </Link>

                    {user ? (
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            await signOut();
                            router.push("/");
                          })();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors hover:bg-accent"
                        style={{ color: "var(--sidebar-foreground)" }}
                      >
                        <LogOut size={13} />
                        Sign out
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition-colors hover:bg-accent"
                        style={{ color: "var(--sidebar-foreground)" }}
                      >
                        <LogIn size={13} />
                        Log in
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!collapsed && (
        <>
          {user && (
            <>
          {/* ── Projects section ── */}
          <div className="px-3 pb-1 pt-4">
            <div className="group mb-2 flex w-full items-center justify-between px-1">
              <span style={sectionLabel}>Projects</span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded-lg p-1.5 opacity-0 transition-[opacity,transform,color] duration-200 ease-out group-hover:opacity-100"
                  style={{
                    color: "var(--sidebar-foreground)",
                    opacity: 0.42,
                    cursor: "pointer",
                  }}
                  title="Create project"
                >
                  <Plus size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  className="rounded-lg p-1.5 transition-[background-color,color,opacity,transform] duration-200 ease-out cursor-pointer"
                  style={{ color: "var(--sidebar-foreground)", opacity: 0.64 }}
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${!projectsOpen ? "-rotate-90" : ""}`}
                  />
                </button>
              </div>
            </div>

            {projectsOpen && (
              <div className="space-y-0.5">
                {isBooting ? (
                  Array.from({ length: projects.length || 4 }).map(
                    (_, i) => (
                      <div
                        key={`project-skeleton-${i}`}
                        className="h-8 animate-pulse rounded-2xl"
                        style={{ background: "var(--muted)", opacity: 0.12 }}
                      />
                    ),
                  )
                ) : projects.length > 0 ? (
                  projects.map((project) => (
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
            </>
          )}

          {/* ── Recents section ── */}
          <div ref={recentsScrollRef} className="flex-1 overflow-y-auto px-3">
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
                  Array.from({ length: recentChats.length || RECENT_CHAT_PAGE_SIZE }).map(
                    (_, i) => (
                      <div
                        key={`chat-skeleton-${i}`}
                        className="h-11 animate-pulse rounded-2xl"
                        style={{ background: "var(--muted)", opacity: 0.12 }}
                      />
                    ),
                  )
                ) : recentChats.length > 0 ? (
                  <>
                    {recentChats.map((chat) => (
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
                    ))}
                    {hasMoreRecentChats && (
                      <div ref={recentsLoadMoreRef} className="px-2.5 py-2">
                        <div className="h-8 rounded-2xl" />
                      </div>
                    )}
                    {isLoadingMoreChats && (
                      <div
                        className="rounded-2xl px-2.5 py-2 text-[12px]"
                        style={{
                          color: "var(--sidebar-foreground)",
                          opacity: 0.48,
                        }}
                      >
                        Loading more chats...
                      </div>
                    )}
                  </>
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
            className="shrink-0 space-y-3 p-2.5"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="space-y-1.5">
              <Link
                href="/settings/billing"
                className="flex h-10 items-center gap-3 rounded-2xl px-3 text-[13px] font-medium transition-colors"
                style={{
                  color: "var(--sidebar-foreground)",
                  opacity: 0.86,
                }}
              >
                <ArrowUpRight size={14} className="shrink-0" />
                <span>See plans and pricing</span>
              </Link>

              <Link
                href="/settings"
                className="flex h-10 items-center gap-3 rounded-2xl px-3 text-[13px] font-medium transition-colors"
                style={{
                  color: "var(--sidebar-foreground)",
                  opacity: 0.86,
                }}
              >
                <Settings size={14} className="shrink-0" />
                <span>Settings</span>
              </Link>

              <Link
                href="/help"
                className="flex h-10 items-center gap-3 rounded-2xl px-3 text-[13px] font-medium transition-colors"
                style={{
                  color: "var(--sidebar-foreground)",
                  opacity: 0.86,
                }}
              >
                <CircleHelp size={14} className="shrink-0" />
                <span>Help</span>
              </Link>
            </div>

            {user ? (
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    await signOut();
                    router.push("/");
                  })()
                }
                className="flex h-10 w-full items-center gap-3 rounded-2xl px-3 text-[13px] font-medium transition-colors hover:bg-accent"
                style={{
                  color: "var(--sidebar-foreground)",
                  opacity: 0.86,
                }}
              >
                <UserCircle2 size={14} className="shrink-0" />
                <span className="truncate">
                  {user.name || user.email || "Account"}
                </span>
              </button>
            ) : (
              <div className="rounded-[28px] border border-border bg-card/70 p-4 shadow-[0_18px_30px_-28px_rgba(0,0,0,0.35)]">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                  Get responses tailored to you
                </p>
                <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">
                  Log in to get answers based on saved chats, plus create images and upload files.
                </p>
                <Link
                  href="/login"
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <LogIn size={14} />
                  Log in
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
