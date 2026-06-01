import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { SiteLoading } from "@/components/site-loading";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoggedOutNavbar from "@/components/LoggedOutNavbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <LoggedOutNavbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
      <Suspense
        fallback={
          <div className="fixed inset-0 z-200 overflow-hidden bg-background">
            <SiteLoading variant="app" />
          </div>
        }
      >
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      </div>
    </div>
  );
}
