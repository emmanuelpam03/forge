import "dotenv/config";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "dev-owner@example.com";
  const name = process.env.SEED_USER_NAME ?? "Dev Owner";
  const id = process.env.SEED_USER_ID ?? randomBytes(16).toString("hex");

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`User already exists: ${existing.id} (${existing.email})`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`Created user: ${user.id} (${user.email})`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
