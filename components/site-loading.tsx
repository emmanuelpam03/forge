type SiteLoadingVariant =
  | "app"
  | "chatpage"
  | "projectpage"
  | "marketing"
  | "auth"
  | "projects"
  | "settings"
  | "search"
  | "pinned"
  | "skills";

const skeletonPulse = {
  background: "var(--muted)",
  opacity: 0.6,
  borderRadius: "10px",
};

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
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
      style={{ background: "var(--background)" }}
    >
      {/* Sidebar skeleton */}
      <aside
        className="flex h-screen w-60 shrink-0 flex-col"
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div
          className="p-2 pb-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex flex-col gap-2.5">
            <SkeletonBlock
              className="h-9 w-full"
              style={{ borderRadius: "12px" }}
            />
            <div className="flex w-full gap-2">
              <SkeletonBlock
                className="flex-1 h-10"
                style={{ borderRadius: "12px" }}
              />
              <SkeletonBlock
                className="h-10 w-10"
                style={{ borderRadius: "12px" }}
              />
            </div>
          </div>
        </div>

        <div className="px-3 pb-1 pt-4">
          <SkeletonBlock
            className="mb-3 h-2.5 w-16"
            style={{ borderRadius: "4px" }}
          />
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock
                key={`sp-${i}`}
                className="h-8 w-full"
                style={{ borderRadius: "10px" }}
              />
            ))}
          </div>
        </div>

        <div
          className="mx-3 my-2 h-px"
          style={{ background: "var(--border)" }}
        />

        <div className="flex-1 px-3">
          <SkeletonBlock
            className="mb-3 h-2.5 w-20"
            style={{ borderRadius: "4px" }}
          />
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock
                key={`sc-${i}`}
                className="h-11 w-full"
                style={{ borderRadius: "10px" }}
              />
            ))}
          </div>
        </div>

        <div
          className="mt-auto p-2.5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <SkeletonBlock
            className="h-10 w-full"
            style={{ borderRadius: "12px" }}
          />
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
              style={{ border: "1px solid var(--border)" }}
            >
              <SkeletonBlock className="h-4 w-32 mb-4" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock
                    key={`mc-${i}`}
                    className="h-28"
                    style={{ borderRadius: "14px" }}
                  />
                ))}
              </div>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ border: "1px solid var(--border)" }}
            >
              <SkeletonBlock className="h-4 w-28 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock
                    key={`sk-${i}`}
                    className="h-24"
                    style={{ borderRadius: "14px" }}
                  />
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

function ProjectPageSkeleton() {
  return (
    <div
      className="flex-1 overflow-hidden p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="mx-auto h-full w-full max-w-5xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <SkeletonBlock
              className="h-3 w-20 mb-2"
              style={{ borderRadius: "4px" }}
            />
            <SkeletonBlock className="h-8 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock
              className="h-10 w-72"
              style={{ borderRadius: "20px" }}
            />
            <SkeletonBlock
              className="h-10 w-24"
              style={{ borderRadius: "8px" }}
            />
          </div>
        </div>

        {/* Badge */}
        <SkeletonBlock
          className="w-48 h-6 mb-4"
          style={{ borderRadius: "20px" }}
        />

        {/* Table header */}
        <div className="grid grid-cols-[minmax(280px,1fr)_150px] gap-4 px-3 mb-2">
          <SkeletonBlock className="h-3 w-16" style={{ borderRadius: "4px" }} />
          <SkeletonBlock className="h-3 w-16" style={{ borderRadius: "4px" }} />
        </div>

        {/* Table rows */}
        <div className="border border-border rounded-2xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`row-${i}`}
              className={`grid grid-cols-[minmax(280px,1fr)_150px] items-center px-3 py-3 ${
                i !== 4 ? "border-b border-border" : ""
              }`}
            >
              <SkeletonBlock className="h-4 w-48" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatPageSkeleton() {
  return (
    <div
      className="flex-1 overflow-hidden p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-0 py-4 mb-5">
          <div>
            <SkeletonBlock
              className="h-2.5 w-12 mb-2"
              style={{ borderRadius: "4px" }}
            />
            <SkeletonBlock className="h-6 w-40" />
          </div>
          <SkeletonBlock
            className="h-6 w-32"
            style={{ borderRadius: "20px" }}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`msg-${i}`}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <div className="max-w-sm">
                <SkeletonBlock className="h-24 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="mt-6">
          <div className="rounded-full bg-card/90 border border-border px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-5 w-5 rounded-full" />
              <SkeletonBlock className="flex-1 h-6" />
              <SkeletonBlock className="h-5 w-5 rounded-full" />
              <SkeletonBlock className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
      />
      <div className="absolute inset-0 flex items-start justify-center pt-16">
        <div
          className="mx-4 w-full max-w-125 overflow-hidden"
          style={{
            borderRadius: "18px",
            border: "1px solid var(--border)",
            background: "var(--card)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <SkeletonBlock className="h-4 w-4 rounded-full" />
            <SkeletonBlock className="h-4 flex-1" />
            <SkeletonBlock
              className="h-6 w-6"
              style={{ borderRadius: "8px" }}
            />
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`sr-${i}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <SkeletonBlock
                  className="h-4 w-4"
                  style={{ borderRadius: "6px" }}
                />
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
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-full max-w-md p-6"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "20px",
          background: "var(--card)",
        }}
      >
        <SkeletonBlock className="h-7 w-28 mb-3" />
        <SkeletonBlock
          className="h-4 w-52 mb-6"
          style={{ borderRadius: "6px" }}
        />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock
              key={`ar-${i}`}
              className="h-12"
              style={{ borderRadius: "12px" }}
            />
          ))}
        </div>
      </div>
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
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-full max-w-5xl p-6"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "20px",
          background: "var(--card)",
        }}
      >
        <SkeletonBlock
          className="h-3 w-20 mb-3"
          style={{ borderRadius: "4px" }}
        />
        <SkeletonBlock className="h-7 w-64 mb-2" />
        <SkeletonBlock
          className="h-4 w-80 mb-6"
          style={{ borderRadius: "6px" }}
        />
        <div className="grid gap-3">
          {Array.from({ length: blocks }).map((_, i) => (
            <SkeletonBlock
              key={`${title}-${i}`}
              className="h-20"
              style={{ borderRadius: "14px" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteLoading({ variant }: { variant: SiteLoadingVariant }) {
  if (variant === "app") return <AppSkeleton />;
  if (variant === "chatpage") return <ChatPageSkeleton />;
  if (variant === "projectpage") return <ProjectPageSkeleton />;
  if (variant === "search") return <SearchSkeleton />;
  if (variant === "auth") return <AuthSkeleton />;
  if (variant === "marketing")
    return <SectionSkeleton title="marketing" blocks={4} />;
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
