import "dotenv/config";
import * as readline from "readline";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function createUser() {
  console.log("\n👤 Create a new user\n");

  const name = await ask("Full name: ");
  const email = await ask("Email address: ");
  const image = await ask("Avatar URL (leave blank to skip): ");

  if (!name || !email) {
    console.error("\n❌ Name and email are required.");
    rl.close();
    process.exit(1);
  }

  rl.close();

  try {
    const user = await prisma.user.create({
      data: {
        id: randomBytes(16).toString("hex"),
        name,
        email,
        emailVerified: false,
        image: image || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("\n✅ User created successfully:");
    console.table({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? "(none)",
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2002") {
      console.error("\n❌ A user with that email already exists.");
    } else {
      console.error("\n❌ Error creating user:", err?.message ?? String(error));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
