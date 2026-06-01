"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOAuthStatus, GOOGLE_OAUTH_SETUP_MESSAGE, signIn } from "@/lib/auth-client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useRef } from "react";
import { useTheme } from "next-themes";

function getGoogleClientId(): string | undefined {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return clientId || undefined;
}

type OneTapPluginClient = {
  oneTap?: (options?: unknown) => Promise<void>;
};

function getPostLoginDestination(): string {
  if (typeof window === "undefined") return "/";
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const status = await getOAuthStatus();
      if (!active) return;
      setGoogleEnabled(status.google);
      setMounted(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error.message || "Sign in failed");
        setLoading(false);
        return;
      }
      await refresh();
      router.push(getPostLoginDestination());
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    if (!googleEnabled) {
      setError(GOOGLE_OAUTH_SETUP_MESSAGE);
      return;
    }
    // Try to use Better Auth client helper (oneTap) if available, otherwise start social flow
    try {
      // dynamic import to avoid SSR issues
      // Attempt to import Better Auth client oneTap helper
      // NOTE: requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to be set
      const googleClientId = getGoogleClientId();
      const mod = await import("better-auth/client/plugins").catch(() => null);
      if (
        googleClientId &&
        mod &&
        typeof mod.oneTapClient === "function"
      ) {
        const client = mod.oneTapClient({
          clientId: googleClientId,
        }) as OneTapPluginClient;
        if (client.oneTap) {
          await client.oneTap();
          return;
        }
      }

      const res = await fetch(`/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "google" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.message || GOOGLE_OAUTH_SETUP_MESSAGE);
        return;
      }
      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }
      setError("Could not start Google sign-in. Check your Google OAuth credentials.");
    } catch {
      setError("Could not start Google sign-in");
    }
  };

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  // Attempt to render a Better Auth GSI button into the `googleBtnRef` container
  useEffect(() => {
    if (!googleEnabled) return;

    let mounted = true;
    (async () => {
      try {
        const googleClientId = getGoogleClientId();
        if (!googleClientId) return;

        const mod = await import("better-auth/client/plugins").catch(() => null);
        if (!mounted || !mod || typeof mod.oneTapClient !== "function") return;
        const client = mod.oneTapClient({
          clientId: googleClientId,
        }) as OneTapPluginClient;
        if (client.oneTap && googleBtnRef.current) {
          await client.oneTap({
            button: {
              container: googleBtnRef.current,
              config: { type: "standard", text: "continue_with" },
            },
          });
        }
      } catch {
        // ignore - fall back to our manual button
      }
    })();
    return () => {
      mounted = false;
    };
  }, [googleEnabled]);

  if (!mounted) return null;

  const isLightMode = resolvedTheme === "light";
  const shellClasses = isLightMode
    ? "border-black/10 bg-[#f4f1ea] text-[#111111] shadow-[0_28px_100px_rgba(0,0,0,0.22)]"
    : "border-white/10 bg-[#2a2a2a] text-white shadow-[0_28px_100px_rgba(0,0,0,0.55)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className={`w-full max-w-[420px] overflow-hidden rounded-[12px] ${shellClasses}`}>
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-[18px] font-medium">Log in or sign up</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-md"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <p className="mb-4 text-sm text-muted-foreground">You’ll get smarter responses and can upload files, images, and more.</p>

          <div className="space-y-3">
            <div className="w-full">
              <div ref={googleBtnRef} />
              {/* fallback button if client helper didn't render */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={!googleEnabled}
                className="mt-3 flex w-full items-center gap-3 rounded-xl bg-[#111111] px-4 py-3 text-sm text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Continue with Google"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.9 0 7.1 1.3 9.5 3.4l7.1-7.1C37.6 2 30.3 0 24 0 14.6 0 6.9 5.6 3.1 13.6l8 6.2C13.9 14.2 18.5 9.5 24 9.5z"/>
                    <path fill="#34A853" d="M46.5 24c0-1.6-.1-3.2-.4-4.7H24v9h12.6c-.5 2.6-2 4.8-4.3 6.3l6.7 5.2C43.9 36.6 46.5 30.7 46.5 24z"/>
                    <path fill="#4A90E2" d="M11.1 28.3c-.6-1.8-1-3.7-1-5.8 0-2.1.4-4 1-5.8l-8-6.2C1.6 17.7 1 20.8 1 24s.6 6.3 1.9 8.8l8.2-4.5z"/>
                    <path fill="#FBBC05" d="M24 46c6.3 0 12-2.1 16.5-5.8l-6.7-5.2C31.8 36 28.2 37 24 37c-5.5 0-10.1-4.7-11.8-11.2l-8.2 4.5C6.9 42.4 14.6 46 24 46z"/>
                  </svg>
                </span>
                <span className="flex-1 text-center">Continue with Google</span>
              </button>
              {!googleEnabled && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Google sign-in is off: add your Client ID and Secret to .env (after the = on each line), save, and restart the dev server.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-black/10" />
              <div className="text-xs text-muted-foreground">OR</div>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="email" className="block text-sm">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <Button type="submit" className="w-full rounded-full">
                {loading ? "Signing in…" : "Continue"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
