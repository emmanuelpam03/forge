"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const emailInputId = "email";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Delegate to the catch-all auth route; Better Auth will handle the flow.
    try {
      await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      setSent(true);
    } catch {
      setSent(true);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Forgot password</h1>
      {sent ? (
        <div className="text-sm">If that email exists you will receive reset instructions.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor={emailInputId} className="block text-sm">
              Email
            </Label>
            <Input
              id={emailInputId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div>
            <Button type="submit" className="rounded-md bg-primary px-4 py-2 text-white">
              Send reset link
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
