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
import useRecentChats from "@/hooks/useRecentChats";
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

function ProjectItem({ project, active }: { project: ProjectItemData; active: boolean }) {
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
      <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2">
        <Folder size={14} className="shrink-0" style={{ color: "var(--sidebar-primary)" }} />
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className="flex-1 truncate rounded-lg bg-transparent px-1 py-0 text-[12.5px] text-foreground outline-none"
          style={{ border: "1px solid var(--sidebar-primary)", color: "var(--sidebar-foreground)" }}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link href={`/p/${project.id}`} className={sidebarItemBase} style={active ? sidebarItemActive : sidebarItemInactive}>
        <span className="flex min-w-0 items-center gap-2">
          <Folder size={14} className="shrink-0" style={{ color: active ? "var(--sidebar-primary)" : "var(--sidebar-foreground)", opacity: active ? 1 : 0.6 }} />
          <span className="block truncate text-base font-semibold leading-tight" style={{ letterSpacing: "-0.01em", color: "var(--sidebar-foreground)" }}>{project.name}</span>
        </span>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="rounded-lg p-1 opacity-0 transition-[opacity,transform,color] duration-200 ease-out group-hover:opacity-100"
          style={{ color: "var(--sidebar-foreground)", opacity: 0.42, cursor: "pointer" }}
        >
          <MoreHorizontal size={12} />
        </button>
      </Link>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-2xl py-1 shadow-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
          <button onClick={(e) => { e.preventDefault(); setIsRenaming(true); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px]" style={{ color: "var(--foreground)" }}> <Pencil size={11} /> Rename</button>
          <button onClick={async (e) => { e.preventDefault(); await handleDelete(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px]" style={{ color: "var(--foreground)" }}> <Trash2 size={11} /> Delete</button>
        </div>
      )}
    </div>
  );
}

function ChatItem({ chat, active, onDelete }: { chat: ChatItemData; active: boolean; onDelete?: (chatId: string) => void; }) {
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
    // reuse existing action
    try {
      const res = await fetch(`/api/chat/${chat.id}/rename`, { method: "POST", body: JSON.stringify({ title: trimmed }), headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Rename failed");
      showFeedback({ type: "success", title: "Chat renamed", description: `Updated to "${trimmed}"` });
    } catch {
      showFeedback({ type: "error", title: "Failed to rename chat" });
      setNewTitle(chat.title);
    }
    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    const result = await deleteChat(chat.id);
    if (result.success) {
      showFeedback({ type: "success", title: "Chat deleted", description: `Removed "${chat.title}"` });
      onDelete?.(chat.id);
      return;
    }
    showFeedback({ type: "error", title: "Failed to delete chat" });
  };

  if (isRenaming) {
    return (
      <div className="flex items-start gap-2 rounded-2xl px-2.5 py-2">
        <MessageSquare size={14} className="mt-0.5 shrink-0" style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }} />
        <input autoFocus type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === "Enter" && handleRename()} className="flex-1 truncate rounded-lg bg-transparent px-1 py-0 text-[12.5px] outline-none" style={{ border: "1px solid var(--sidebar-primary)", color: "var(--sidebar-foreground)" }} />
      </div>
    );
  }

  return (
    <div className="relative">
      <Link href={`/c/${chat.id}`} className={sidebarItemBase} style={active ? sidebarItemActive : sidebarItemInactive}>
        <span className="flex min-w-0 gap-2">
          <MessageSquare size={14} className="mt-0.5 shrink-0" style={{ color: active ? "var(--sidebar-primary)" : "var(--sidebar-foreground)", opacity: active ? 1 : 0.6 }} />
          <span className="block truncate text-base font-semibold leading-tight" style={{ letterSpacing: "-0.01em", color: "var(--sidebar-foreground)" }}>{chat.title}</span>
        </span>

        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }} className="rounded-lg p-1 opacity-0 transition-[opacity,transform,color] duration-200 ease-out group-hover:opacity-100" style={{ color: "var(--sidebar-foreground)", opacity: 0.42, cursor: "pointer" }}>
          <MoreHorizontal size={12} />
        </button>
      </Link>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl py-1 shadow-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
          <button onClick={(e) => { e.preventDefault(); setIsRenaming(true); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px]" style={{ color: "var(--foreground)" }}><Pencil size={11} /> Rename</button>
          <button onClick={(e) => { e.preventDefault(); void handleDelete(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px]" style={{ color: "var(--destructive)" }}><Trash2 size={11} /> Delete</button>
        </div>
      )}
    </div>
  );
}

export function SidebarClient({ initialProjects, initialChats }: { initialProjects: ProjectItemData[]; initialChats: ChatItemData[]; }) {
  const { showFeedback } = useFeedback();
  const pathname = usePathname();
  const router = useRouter();

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const { recentChats, setRecentChats } = useRecentChats(initialChats);

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
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "var(--sidebar-foreground)",
    opacity: 0.9,
  };

  return (
    <aside className="flex h-screen shrink-0 flex-col transition-[width] duration-200" style={{ width: collapsed ? "64px" : "15rem", background: "var(--card)", borderRight: "1px solid var(--sidebar-border)" }}>
      <div className="p-2 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        {collapsed ? (
          <button type="button" onClick={() => setCollapsed(false)} className="flex h-9 w-full items-center justify-center rounded-2xl"><ChevronRight size={13} /></button>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sidebar-accent border border-sidebar-border"><ForgeLogo className="h-5 w-5 text-sidebar-foreground" /></span>
                <span className="text-sm font-semibold tracking-[-0.02em]" style={{ color: "var(--sidebar-foreground)" }}>Forge</span>
              </Link>
              <button type="button" onClick={() => setCollapsed((v) => !v)} className="rounded-lg p-1">
                <ChevronLeft size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-2 py-3">
        <div style={sectionLabel} className="mb-3">Recent</div>
        <div className="space-y-2">
          {collapsedRecentChats.map((c) => (
            <ChatItem key={c.id} chat={c} active={pathname?.startsWith(`/c/${c.id}`) ?? false} onDelete={(id) => setRecentChats((prev) => prev.filter((p) => p.id !== id))} />
          ))}
        </div>
      </div>
    </aside>
  );
}
