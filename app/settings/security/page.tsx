"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import SettingsShell from "../../../components/SettingsShell";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sendPasswordReset() {
    setLoading(true);
    try {
      await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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
    try {
      const res = await fetch("/api/settings/security/sign-out-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      await authClient.signOut();
      router.push("/");
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsShell>
      <div className="flex w-full flex-col gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Settings
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
            Security
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
            Manage your security and account access.
          </p>
        </div>

        <section className="space-y-3">
          <button
            onClick={sendPasswordReset}
            disabled={loading}
            className="w-full rounded-[18px] border border-border bg-card/90 p-4 text-left transition hover:bg-card"
          >
            <p className="text-[14px] font-medium text-foreground">Reset password</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Send a reset link to your email</p>
          </button>

          <button
            onClick={signOutThis}
            disabled={loading}
            className="w-full rounded-[18px] border border-border bg-card/90 p-4 text-left transition hover:bg-card"
          >
            <p className="text-[14px] font-medium text-foreground">Sign out this device</p>
            <p className="mt-1 text-[13px] text-muted-foreground">End your session on this device</p>
          </button>

          <button
            onClick={signOutAll}
            disabled={loading}
            className="w-full rounded-[18px] border border-border bg-card/90 p-4 text-left transition hover:bg-card"
          >
            <p className="text-[14px] font-medium text-foreground">Sign out all devices</p>
            <p className="mt-1 text-[13px] text-muted-foreground">End all sessions across all devices</p>
          </button>

          <button
            onClick={deleteAccount}
            disabled={loading}
            className="w-full rounded-[18px] border border-destructive/20 bg-destructive/5 p-4 text-left transition hover:bg-destructive/10"
          >
            <p className="text-[14px] font-medium text-destructive">Delete account</p>
            <p className="mt-1 text-[13px] text-destructive/70">Permanently delete your account and data</p>
          </button>
        </section>
      </div>
    </SettingsShell>
  );
}
