import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import type { Auth } from "better-auth";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  experimental: { joins: true },
  emailAndPassword: {
    enabled: true,
  },
});

export const authHandler: Auth["handler"] = auth.handler;
