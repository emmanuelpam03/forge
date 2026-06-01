import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const ownerEmail = process.env.BACKFILL_OWNER_EMAIL;
  const ownerIdEnv = process.env.BACKFILL_OWNER_ID;

  let ownerId: string | null = null;

  if (ownerIdEnv) {
    ownerId = ownerIdEnv;
  } else if (ownerEmail) {
    const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!user) {
      throw new Error(`No user found with email ${ownerEmail}`);
    }
    ownerId = user.id;
  } else {
    // Fallback: pick the first user in the database (useful for quick backfills in dev)
    const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!firstUser) {
      throw new Error(
        "No users found in the database. Provide BACKFILL_OWNER_ID or BACKFILL_OWNER_EMAIL in environment to identify the owner for existing rows",
      );
    }
    console.warn("No BACKFILL_OWNER_ID or BACKFILL_OWNER_EMAIL provided — using first user in DB as owner:", firstUser.email);
    ownerId = firstUser.id;
  }

  console.log(`Using owner id: ${ownerId}`);

  const updateProjects = await prisma.project.updateMany({
    where: { userId: null },
    data: { userId: ownerId },
  });

  const updateChats = await prisma.chat.updateMany({
    where: { userId: null },
    data: { userId: ownerId },
  });

  console.log(`Updated projects: ${updateProjects.count}`);
  console.log(`Updated chats: ${updateChats.count}`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
