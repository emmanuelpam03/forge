"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/actions/chats";
import { useFeedback } from "@/components/feedback-provider";

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { showFeedback } = useFeedback();

  const handleCreateProjectChat = async () => {
    const result = await createChat(projectId);
    if (result.success && result.chat) {
      router.push(`/c/${result.chat.id}`);
    } else {
      showFeedback({
        type: "error",
        title: "Failed to create chat",
      });
    }
  };

  return (
    <button
      onClick={handleCreateProjectChat}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
    >
      <Plus size={14} />
      New chat
    </button>
  );
}
