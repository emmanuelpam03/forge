"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useFeedback } from "./feedback-provider";

export function KeyboardShortcuts() {
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const createProject = useAppStore((store) => store.createProject);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.repeat) return;

      const key = e.key.toLowerCase();

      // Cmd/Ctrl+K for search
      if (key === "k") {
        e.preventDefault();
        router.push("/search");
      }

      // Cmd/Ctrl+N for new chat
      if (key === "n") {
        e.preventDefault();
        router.push("/");
      }

      // Cmd/Ctrl+P for new project
      if (key === "p") {
        e.preventDefault();
        const project = createProject();
        showFeedback({
          type: "success",
          title: "Project created",
          description: `Opened \"${project.name}\"`,
        });
        router.push(project.href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createProject, router, showFeedback]);

  return null;
}
