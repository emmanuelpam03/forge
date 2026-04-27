export default function Loading() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <aside className="flex h-screen w-62 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border p-2">
          <div className="h-9 rounded-xl bg-muted/60 animate-pulse" />
        </div>

        <div className="px-3 pb-1 pt-4">
          <div className="mb-2 h-3 w-20 rounded bg-muted/60 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`sidebar-project-${index}`}
                className="h-8 rounded-lg bg-muted/60 animate-pulse"
              />
            ))}
          </div>
        </div>

        <div className="mx-3 my-2 h-px bg-sidebar-border" />

        <div className="flex-1 px-3">
          <div className="mb-2 h-3 w-24 rounded bg-muted/60 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`sidebar-chat-${index}`}
                className="h-11 rounded-lg bg-muted/60 animate-pulse"
              />
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-sidebar-border p-2.5">
          <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
        </div>
      </aside>

      <main className="flex-1 overflow-hidden p-6">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
          <div className="h-8 w-56 rounded bg-muted/60 animate-pulse" />
          <div className="h-5 w-96 rounded bg-muted/60 animate-pulse" />
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="h-5 w-40 rounded bg-muted/60 animate-pulse" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`main-card-${index}`}
                    className="h-28 rounded-2xl bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="h-5 w-32 rounded bg-muted/60 animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`status-card-${index}`}
                    className="h-24 rounded-2xl bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="h-32 rounded-3xl border border-border bg-card p-5 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
