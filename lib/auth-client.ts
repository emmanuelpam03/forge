"use client";

import { createAuthClient } from "better-auth/react";

export const GOOGLE_OAUTH_SETUP_MESSAGE =
  "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (non-empty values after the =), save the file, then restart the dev server.";

export const authClient = createAuthClient();

export async function getOAuthStatus(): Promise<{ google: boolean }> {
  try {
    const res = await fetch("/api/auth/oauth-status");
    if (!res.ok) return { google: false };
    return (await res.json()) as { google: boolean };
  } catch {
    return { google: false };
  }
}

export async function signIn(email: string, password: string) {
  return authClient.signIn.email({ email, password });
}

export async function signUp(email: string, password: string, name?: string) {
  return authClient.signUp.email({
    email,
    password,
    name: name?.trim() || email.split("@")[0] || "User",
  });
}

export async function signOut() {
  return authClient.signOut();
}

export async function getSession() {
  const { data, error } = await authClient.getSession();
  if (error) return null;
  return data;
}
