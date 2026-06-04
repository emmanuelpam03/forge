"use client";

import React, { createContext, useContext, useMemo } from "react";
import { authClient, signOut as signOutClient } from "@/lib/auth-client";

type AuthUser = typeof authClient.$Infer.Session.user;

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user ?? (session === undefined ? initialUser : null);
  const loading = isPending && !user;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh: async () => {
        await refetch();
      },
      signOut: async () => {
        await signOutClient();
        await refetch();
      },
    }),
    [user, loading, refetch],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthProvider;
