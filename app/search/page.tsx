"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Folder, X } from "lucide-react";
import { getProjects } from "@/lib/actions/projects";
import { getRecentChats } from "@/lib/actions/chats";
import { useFeedback } from "@/components/feedback-provider";

export default function SearchPage() {
  const { showFeedback } = useFeedback();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState(recentChats);
  const [filteredProjects, setFilteredProjects] = useState(projects);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [fetchedProjects, fetchedChats] = await Promise.all([
        getProjects(),
        getRecentChats(10),
      ]);
      setProjects(fetchedProjects);
      setRecentChats(
        fetchedChats.map((chat) => ({
          id: chat.id,
          title: chat.title,
          preview: chat.messages[0]?.content || "",
        })),
      );
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) {
      setFilteredChats(recentChats);
      setFilteredProjects(projects);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = window.setTimeout(() => {
      setFilteredChats(
        recentChats.filter(
          (chat) =>
            chat.title.toLowerCase().includes(searchTerm) ||
            chat.preview.toLowerCase().includes(searchTerm),
        ),
      );

      setFilteredProjects(
        projects.filter((project) =>
          project.name.toLowerCase().includes(searchTerm),
        ),
      );

      setIsSearching(false);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [query, recentChats, projects]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.back();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [router]);

  const hasResults = filteredChats.length > 0 || filteredProjects.length > 0;
  const totalResults = filteredChats.length + filteredProjects.length;

  const handleSearchSubmit = () => {
    const term = query.trim();

    if (!term) {
      showFeedback({
        type: "error",
        title: "Enter a search term",
      });
      return;
    }

    if (isSearching) {
      showFeedback({
        type: "info",
        title: "Searching...",
      });
      return;
    }

    if (totalResults === 0) {
      showFeedback({
        type: "error",
        title: "No matches found",
        description: `No chats or projects match \"${term}\"`,
      });
      return;
    }

    showFeedback({
      type: "success",
      title: "Search complete",
      description: `${totalResults} result${totalResults === 1 ? "" : "s"} found`,
    });
  };

  return (
    <div className="relative h-full overflow-hidden bg-background">
      {/* Modal Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => router.back()}
      />

      {/* Search Modal */}
      <div className="absolute inset-0 flex items-start justify-center pt-16 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[500px] mx-4 rounded-2xl border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              placeholder="Search chats and projects..."
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => router.back()}
              className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isSearching ? (
              <div className="space-y-2 px-3 py-3 h-48">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`search-skeleton-${index}`}
                    className="h-10 animate-pulse rounded-lg bg-muted/60"
                  />
                ))}
              </div>
            ) : isLoading ? (
              <div className="space-y-2 px-3 py-3 h-48">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`load-skeleton-${index}`}
                    className="h-10 animate-pulse rounded-lg bg-muted/60"
                  />
                ))}
              </div>
            ) : !hasResults && query ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <Search size={32} className="text-muted-foreground/40" />
                <p className="text-[14px] text-muted-foreground">
                  No results found for "{query}"
                </p>
              </div>
            ) : !hasResults ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <Search size={32} className="text-muted-foreground/40" />
                <p className="text-[14px] text-muted-foreground">
                  Start typing to search
                </p>
              </div>
            ) : (
              <>
                {filteredChats.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-popover/80 backdrop-blur-sm border-b border-border px-4 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Chats
                      </p>
                    </div>
                    <div className="space-y-1 px-2 py-2">
                      {filteredChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={`/c/${chat.id}`}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors group"
                        >
                          <MessageSquare
                            size={14}
                            className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="block truncate text-[13px] font-medium text-foreground">
                              {chat.title}
                            </p>
                            <p className="block truncate text-[12px] text-muted-foreground">
                              {chat.preview}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {filteredProjects.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-popover/80 backdrop-blur-sm border-b border-border px-4 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Projects
                      </p>
                    </div>
                    <div className="space-y-1 px-2 py-2">
                      {filteredProjects.map((project) => (
                        <Link
                          key={project.id}
                          href={project.href}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors group"
                        >
                          <Folder
                            size={14}
                            className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
                          />
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {project.name}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
