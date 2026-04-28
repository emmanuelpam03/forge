import { PrismaClient } from "@/app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof makePrismaClient> | undefined;
};

function makePrismaClient() {
  const accelerateUrl = process.env.DATABASE_URL;

  if (!accelerateUrl) {
    throw new Error("DATABASE_URL is required for Prisma Accelerate.");
  }

  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate());
}

const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
