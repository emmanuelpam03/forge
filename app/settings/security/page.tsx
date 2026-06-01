"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import SettingsShell from "../../../components/SettingsShell";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/security/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMessage("Email updated");
    } catch (err: any) {
      setMessage(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    setLoading(true);
    setMessage(null);
    try {
      await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setMessage("If your email is registered, a reset link was sent.");
    } catch (err: any) {
      setMessage("Error sending reset email");
    } finally {
      setLoading(false);
    }
  }

  async function signOutThis() {
    setLoading(true);
    await authClient.signOut();
    router.push("/");
  }

  async function signOutAll() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/security/sign-out-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      // also sign out locally
      await authClient.signOut();
      router.push("/");
    } catch (err: any) {
      setMessage("Error signing out everywhere");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/settings/security/delete-account", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      await authClient.signOut();
      router.push("/");
    } catch (err: any) {
      setMessage("Error deleting account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
              Security
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              Manage sign-in, email and account actions.
            </p>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[18px] border border-border bg-card p-5">
            <h2 className="text-[16px] font-semibold">Change email</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update the email used for this account.</p>
            <form onSubmit={changeEmail} className="mt-4 flex gap-2">
              <input
                className="flex-1 rounded-md border border-border bg-muted px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new-email@example.com"
                type="email"
                required
              />
              <button className="rounded-md bg-primary px-4 py-2 text-white" disabled={loading}>
                Save
              </button>
            </form>
          </div>

          <div className="rounded-[18px] border border-border bg-card p-5">
            <h2 className="text-[16px] font-semibold">Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Change your password or send a reset email.</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-md bg-primary px-4 py-2 text-white" onClick={sendPasswordReset} disabled={loading}>
                Send reset email
              </button>
            </div>
          </div>

          <div className="rounded-[18px] border border-border bg-card p-5">
            <h2 className="text-[16px] font-semibold">Sign out</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign out from this device or all devices.</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-md border border-border px-4 py-2" onClick={signOutThis} disabled={loading}>
                Sign out (this device)
              </button>
              <button className="rounded-md bg-primary px-4 py-2 text-white" onClick={signOutAll} disabled={loading}>
                Sign out (all devices)
              </button>
            </div>
          </div>

          <div className="rounded-[18px] border border-border bg-card p-5">
            <h2 className="text-[16px] font-semibold text-destructive">Danger</h2>
            <p className="mt-1 text-sm text-muted-foreground">Permanently delete your account and data.</p>
            <div className="mt-4">
              <button className="rounded-md bg-destructive px-4 py-2 text-white" onClick={deleteAccount} disabled={loading}>
                Delete account
              </button>
            </div>
          </div>
        </section>

        {message ? <div className="mt-4 text-sm text-muted-foreground">{message}</div> : null}
      </div>
    </SettingsShell>
  );
}
