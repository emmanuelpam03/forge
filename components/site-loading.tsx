type SiteLoadingVariant =
  | "app"
  | "marketing"
  | "auth"
  | "chat"
  | "projects"
  | "settings"
  | "search"
  | "pinned"
  | "skills";

function AppSkeleton() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <aside className="flex h-screen w-62 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border p-2">
          <div className="h-9 animate-pulse rounded-xl bg-muted/60" />
        </div>

        <div className="px-3 pb-1 pt-4">
          <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted/60" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`sidebar-project-${index}`}
                className="h-8 animate-pulse rounded-lg bg-muted/60"
              />
            ))}
          </div>
        </div>

        <div className="mx-3 my-2 h-px bg-sidebar-border" />

        <div className="flex-1 px-3">
          <div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted/60" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`sidebar-chat-${index}`}
                className="h-11 animate-pulse rounded-lg bg-muted/60"
              />
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-sidebar-border p-2.5">
          <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </aside>

      <main className="flex-1 overflow-hidden p-6">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
          <div className="h-8 w-56 animate-pulse rounded bg-muted/60" />
          <div className="h-5 w-96 animate-pulse rounded bg-muted/60" />
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="h-5 w-40 animate-pulse rounded bg-muted/60" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`main-card-${index}`}
                    className="h-28 animate-pulse rounded-2xl bg-muted/60"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`status-card-${index}`}
                    className="h-24 animate-pulse rounded-2xl bg-muted/60"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="h-32 animate-pulse rounded-3xl border border-border bg-card p-5" />
        </div>
      </main>
    </div>
  );
}

function SectionSkeleton({
  title,
  blocks = 3,
}: {
  title: string;
  blocks?: number;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-5xl rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded bg-muted/60" />
        <div className="mt-2 h-5 w-88 animate-pulse rounded bg-muted/60" />
        <div className="mt-6 grid gap-3">
          {Array.from({ length: blocks }).map((_, index) => (
            <div
              key={`${title}-block-${index}`}
              className="h-20 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-start justify-center pt-16">
        <div className="mx-4 w-full max-w-125 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="h-5 w-5 animate-pulse rounded-full bg-muted/60" />
            <div className="h-5 flex-1 animate-pulse rounded bg-muted/60" />
            <div className="h-7 w-7 animate-pulse rounded bg-muted/60" />
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`search-row-${index}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              >
                <div className="h-4 w-4 animate-pulse rounded bg-muted/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-64 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="h-8 w-32 animate-pulse rounded bg-muted/60" />
        <div className="mt-3 h-5 w-56 animate-pulse rounded bg-muted/60" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`auth-row-${index}`}
              className="h-12 animate-pulse rounded-xl bg-muted/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteLoading({ variant }: { variant: SiteLoadingVariant }) {
  if (variant === "app") return <AppSkeleton />;
  if (variant === "search") return <SearchSkeleton />;
  if (variant === "auth") return <AuthSkeleton />;
  if (variant === "marketing")
    return <SectionSkeleton title="marketing" blocks={4} />;
  if (variant === "chat") return <SectionSkeleton title="chat" blocks={5} />;
  if (variant === "projects")
    return <SectionSkeleton title="projects" blocks={4} />;
  if (variant === "settings")
    return <SectionSkeleton title="settings" blocks={4} />;
  if (variant === "pinned")
    return <SectionSkeleton title="pinned" blocks={4} />;
  if (variant === "skills")
    return <SectionSkeleton title="skills" blocks={3} />;

  return <AppSkeleton />;
}
