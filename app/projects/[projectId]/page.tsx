"use client";

import { useParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const project = useAppStore((store) =>
    store.projects.find((item) => item.id === projectId),
  );

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#111111]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 40%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-180 px-6">
        <div className="rounded-[18px] border border-[#2d2d2d] bg-[#1e1e1e] p-7">
          <h1 className="text-[26px] font-semibold text-white leading-tight tracking-tight">
            {project?.name ?? "Project"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Project chats will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
