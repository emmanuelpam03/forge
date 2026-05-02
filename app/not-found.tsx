import Link from "next/link";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
            <AlertCircle size={48} className="text-primary" />
          </div>
        </div>

        {/* 404 Heading */}
        <h1
          className="mb-2 text-7xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          404
        </h1>

        {/* Subtitle */}
        <h2 className="mb-3 text-xl font-semibold text-foreground">
          Page not found
        </h2>

        {/* Description */}
        <p className="mb-8 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist. It may have been
          moved or deleted.
        </p>

        {/* Divider */}
        <div className="mb-8 h-px bg-border" />

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1" variant="default">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link
              href="/c"
              className="inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
          </Button>
        </div>

        {/* Footer text */}
        <p className="mt-8 text-xs text-muted-foreground">
          Error code: 404 — Not Found
        </p>
      </div>
    </div>
  );
}
