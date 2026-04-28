import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { SiteLoading } from "@/components/site-loading";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Suspense
        fallback={
          <div className="fixed inset-0 z-200 overflow-hidden bg-background">
            <SiteLoading variant="app" />
          </div>
        }
      >
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
