import "dotenv/config";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

async function createUser(name: string, email: string, image?: string) {
  try {
    const user = await prisma.user.create({
      data: {
        id: randomBytes(16).toString("hex"),
        name,
        email,
        emailVerified: false,
        image: image || null,
      },
    });

    console.log("✅ User created successfully:");
    console.log(user);
    return user;
  } catch (error) {
    console.error("❌ Error creating user:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments from command line
const [name, email, image] = process.argv.slice(2);

if (!name || !email) {
  console.error(
    "❌ Usage: pnpm tsx scripts/create-user.ts <name> <email> [image]",
  );
  console.error(
    "Example: pnpm tsx scripts/create-user.ts 'John Doe' 'john@example.com'",
  );
  process.exit(1);
}

createUser(name, email, image).catch(() => process.exit(1));
