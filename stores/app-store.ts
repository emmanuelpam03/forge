"use client";

import { useSyncExternalStore } from "react";

export type Project = {
  id: string;
  name: string;
  href: string;
};

export type RecentChat = {
  id: string;
  title: string;
  preview: string;
  href: string;
  projectId?: string;
};

type AppState = {
  projects: Project[];
  recentChats: RecentChat[];
};

type AppActions = {
  createProject: () => Project;
  createChat: (projectId?: string) => RecentChat;
};

type AppStore = AppState & AppActions;

const initialState: AppState = {
  projects: [
    { id: "1", name: "Work", href: "/projects/1" },
    { id: "2", name: "Investing", href: "/projects/2" },
    { id: "3", name: "Clients", href: "/projects/3" },
    { id: "4", name: "Ideas", href: "/projects/4" },
  ],
  recentChats: [
    {
      id: "1",
      title: "Forex growth strategy",
      preview: "Build a scalable forex plan with risk control...",
      href: "/chat/1",
    },
    {
      id: "2",
      title: "Landing page ideas",
      preview: "Modern hero section ideas for Forge...",
      href: "/chat/2",
    },
    {
      id: "3",
      title: "Fitness meal prep",
      preview: "High protein low cost weekly meals...",
      href: "/chat/3",
    },
  ],
};

let state: AppState = initialState;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function generateId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createProject() {
  const id = generateId();
  const project: Project = {
    id,
    name: "New Project",
    href: `/projects/${id}`,
  };

  state = {
    ...state,
    projects: [project, ...state.projects],
  };
  emit();

  return project;
}

function createChat(projectId?: string) {
  const id = generateId();
  const chat: RecentChat = {
    id,
    title: "New Chat",
    preview: "Start a conversation...",
    href: `/chat/${id}`,
    ...(projectId ? { projectId } : {}),
  };

  state = {
    ...state,
    recentChats: [chat, ...state.recentChats],
  };
  emit();

  return chat;
}

function getSnapshot(): AppStore {
  return {
    ...state,
    createProject,
    createChat,
  };
}

export function useAppStore<T>(selector: (store: AppStore) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
}
