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

const skeletonPulse = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "10px",
};

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse ${className ?? ""}`}
      style={{ ...skeletonPulse, ...style }}
    />
  );
}

function AppSkeleton() {
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: "rgb(10,9,8)" }}
    >
      {/* Sidebar skeleton */}
      <aside
        className="flex h-screen w-60 shrink-0 flex-col"
        style={{
          background: "rgba(10,9,8,0.97)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="p-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <SkeletonBlock className="h-9 w-full" style={{ borderRadius: "12px" }} />
        </div>

        <div className="px-3 pb-1 pt-4">
          <SkeletonBlock className="mb-3 h-2.5 w-16" style={{ borderRadius: "4px" }} />
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={`sp-${i}`} className="h-8 w-full" style={{ borderRadius: "10px" }} />
            ))}
          </div>
        </div>

        <div
          className="mx-3 my-2 h-px"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />

        <div className="flex-1 px-3">
          <SkeletonBlock className="mb-3 h-2.5 w-20" style={{ borderRadius: "4px" }} />
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={`sc-${i}`} className="h-11 w-full" style={{ borderRadius: "10px" }} />
            ))}
          </div>
        </div>

        <div
          className="mt-auto p-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <SkeletonBlock className="h-10 w-full" style={{ borderRadius: "12px" }} />
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 overflow-hidden p-6">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
          <SkeletonBlock className="h-7 w-52" />
          <SkeletonBlock className="h-4 w-80" style={{ borderRadius: "6px" }} />
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div
              className="rounded-2xl p-5"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <SkeletonBlock className="h-4 w-32 mb-4" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={`mc-${i}`} className="h-28" style={{ borderRadius: "14px" }} />
                ))}
              </div>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <SkeletonBlock className="h-4 w-28 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={`sk-${i}`} className="h-24" style={{ borderRadius: "14px" }} />
                ))}
              </div>
            </div>
          </div>
          <SkeletonBlock className="h-28" style={{ borderRadius: "16px" }} />
        </div>
      </main>
    </div>
  );
}

function SectionSkeleton({ title, blocks = 3 }: { title: string; blocks?: number }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ background: "rgb(10,9,8)" }}
    >
      <div
        className="w-full max-w-5xl p-6"
        style={{
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <SkeletonBlock className="h-3 w-20 mb-3" style={{ borderRadius: "4px" }} />
        <SkeletonBlock className="h-7 w-64 mb-2" />
        <SkeletonBlock className="h-4 w-80 mb-6" style={{ borderRadius: "6px" }} />
        <div className="grid gap-3">
          {Array.from({ length: blocks }).map((_, i) => (
            <SkeletonBlock key={`${title}-${i}`} className="h-20" style={{ borderRadius: "14px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: "rgb(10,9,8)" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      />
      <div className="absolute inset-0 flex items-start justify-center pt-16">
        <div
          className="mx-4 w-full max-w-[30rem] overflow-hidden"
          style={{
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(14,12,10,0.98)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <SkeletonBlock className="h-4 w-4 rounded-full" />
            <SkeletonBlock className="h-4 flex-1" />
            <SkeletonBlock className="h-6 w-6" style={{ borderRadius: "8px" }} />
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sr-${i}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <SkeletonBlock className="h-4 w-4" style={{ borderRadius: "6px" }} />
                <div className="flex-1 space-y-1.5">
                  <SkeletonBlock className="h-3 w-36" />
                  <SkeletonBlock className="h-3 w-56" />
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
    <div
      className="flex min-h-[calc(100vh-2rem)] items-center justify-center p-6"
      style={{ background: "rgb(10,9,8)" }}
    >
      <div
        className="w-full max-w-md p-6"
        style={{
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <SkeletonBlock className="h-7 w-28 mb-3" />
        <SkeletonBlock className="h-4 w-52 mb-6" style={{ borderRadius: "6px" }} />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={`ar-${i}`} className="h-12" style={{ borderRadius: "12px" }} />
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
  if (variant === "marketing") return <SectionSkeleton title="marketing" blocks={4} />;
  if (variant === "chat") return <SectionSkeleton title="chat" blocks={5} />;
  if (variant === "projects") return <SectionSkeleton title="projects" blocks={4} />;
  if (variant === "settings") return <SectionSkeleton title="settings" blocks={4} />;
  if (variant === "pinned") return <SectionSkeleton title="pinned" blocks={4} />;
  if (variant === "skills") return <SectionSkeleton title="skills" blocks={3} />;
  return <AppSkeleton />;
}