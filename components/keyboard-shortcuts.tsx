"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/actions/projects";
import { useFeedback } from "./feedback-provider";

export function KeyboardShortcuts() {
  const { showFeedback } = useFeedback();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.repeat) return;

      const key = e.key.toLowerCase();

      // Cmd/Ctrl+K for search
      if (key === "k") {
        e.preventDefault();
        window.setTimeout(() => {
          router.push("/search");
        }, 0);
      }

      // Cmd/Ctrl+N for new chat
      if (key === "n") {
        e.preventDefault();
        window.setTimeout(() => {
          router.push("/");
        }, 0);
      }

      // Cmd/Ctrl+P for new project
      if (key === "p") {
        e.preventDefault();
        const result = await createProject();
        if (result.success && result.project) {
          showFeedback({
            type: "success",
            title: "Project created",
            description: `Opened \"${result.project.name}\"`,
          });
          window.setTimeout(() => {
            router.push(`/p/${result.project.id}`);
          }, 0);
        } else {
          showFeedback({
            type: "error",
            title: "Failed to create project",
            description: result.error,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, showFeedback]);

  return null;
}
