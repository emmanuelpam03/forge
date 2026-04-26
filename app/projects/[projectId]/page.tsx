"use client";

import { Folder, Pin, Plus, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

const MODIFIED_BY_PROJECT_ID: Record<string, string> = {
  "1": "Apr 14",
  "2": "Apr 5",
  "3": "Dec 15, 2025",
  "4": "Apr 24",
};

function formatModified(projectId: string) {
  return MODIFIED_BY_PROJECT_ID[projectId] ?? "Mar 6";
}

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projects = useAppStore((store) => store.projects);

  const pinnedProjectId = params.projectId;

  return (
    <div className="relative h-full overflow-hidden bg-[#111111] px-8 py-7 lg:px-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 65% 20%, rgba(16,163,127,0.06) 0%, transparent 72%)",
        }}
      />

      <div className="relative z-10 h-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[44px] font-semibold tracking-tight text-zinc-100">
            Projects
          </h1>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-[340px] items-center gap-2 rounded-full border border-[#343434] bg-[#171717] px-5 text-zinc-400">
              <Search size={17} />
              <span className="text-[31px] leading-none">Search projects</span>
            </div>

            <button className="flex h-12 items-center rounded-full bg-zinc-100 px-5 text-[31px] leading-none font-medium text-zinc-900 transition hover:bg-white">
              New
            </button>
          </div>
        </div>

        <div className="mt-9 inline-flex items-center rounded-full bg-[#2b2b2b] px-5 py-2 text-[31px] leading-none text-zinc-100">
          All
        </div>

        <div className="mt-10 grid grid-cols-[minmax(320px,1fr)_180px_54px] items-center px-1 text-[36px] leading-none text-zinc-300">
          <span>Name</span>
          <span>Modified</span>
          <span className="sr-only">Pinned</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[#242424] bg-[#151515]/50">
          {projects.map((project, index) => {
            const isPinned = project.id === pinnedProjectId || index < 2;

            return (
              <div
                key={project.id}
                className="grid grid-cols-[minmax(320px,1fr)_180px_54px] items-center border-b border-[#262626] px-1 last:border-b-0"
              >
                <div className="flex items-center gap-4 py-5">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#3a3a3a] bg-[#181818]">
                    <Folder
                      size={24}
                      className={
                        project.id === "2" ? "text-[#10a37f]" : "text-zinc-200"
                      }
                    />
                  </span>
                  <span className="text-[34px] leading-none text-zinc-100">
                    {project.name}
                  </span>
                </div>

                <span className="text-[34px] leading-none text-zinc-300">
                  {formatModified(project.id)}
                </span>

                <button
                  className={`inline-flex items-center justify-center ${
                    isPinned ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  <Pin size={24} />
                </button>
              </div>
            );
          })}
        </div>

        <button className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#343434] bg-[#171717] px-5 py-2 text-[31px] leading-none text-zinc-300 transition hover:border-[#3f3f3f] hover:text-zinc-100">
          <Plus size={16} />
          Add project
        </button>
      </div>
    </div>
  );
}
