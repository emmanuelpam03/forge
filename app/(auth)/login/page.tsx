"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useTheme } from "next-themes";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // avoid hydration mismatch for next-themes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn(email, password);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error || "Sign in failed");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const res = await fetch(`/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });
      const payload = await res.json().catch(() => null);
      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }
      // fallback: go to auth route
      window.location.href = "/api/auth/sign-in?provider=google";
    } catch {
      setError("Could not start Google sign-in");
    }
  };

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
            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-black/90 px-4 py-3 text-sm text-white"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44.5 20H24v8.5h11.9C34.1 33 30.1 36 24 36c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.6 0 6.8 1.4 9.2 3.8l6.5-6.5C35.3 4.9 29.9 2.5 24 2.5 12 2.5 2.5 12 2.5 24S12 45.5 24 45.5c11 0 20-7.8 20-21.5 0-1.4-.1-2.5-.5-3z" fill="#4285F4"/>
              </svg>
              Continue with Google
            </button>

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
