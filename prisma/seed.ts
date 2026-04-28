import { PrismaClient } from "../app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

function getPrismaClient() {
  const accelerateUrl = process.env.DATABASE_URL;

  if (!accelerateUrl) {
    throw new Error("DATABASE_URL is required for Prisma Accelerate.");
  }

  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate());
}

const prisma = getPrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Project: Forex Growth
  const forexProject = await prisma.project.upsert({
    where: { id: "forex-growth-001" },
    update: {},
    create: {
      id: "forex-growth-001",
      name: "Forex Growth",
      description: "Trading systems, risk management and scaling plans",
      color: "#10b981",
      isPinned: false,
    },
  });

  console.log("✓ Created project:", forexProject.name);

  // Create Chat inside Forex Growth project
  const forexChat = await prisma.chat.upsert({
    where: { id: "forex-chat-001" },
    update: {},
    create: {
      id: "forex-chat-001",
      title: "GBPUSD Risk Strategy",
      summary: "Build a disciplined risk plan for funded accounts.",
      projectId: forexProject.id,
      isPinned: false,
      isArchived: false,
    },
  });

  console.log("✓ Created chat:", forexChat.title);

  // Add messages to Forex chat
  await prisma.message.deleteMany({
    where: { chatId: forexChat.id },
  });

  await prisma.message.createMany({
    data: [
      {
        id: "forex-msg-001",
        chatId: forexChat.id,
        role: "user",
        content:
          "How do I grow a funded forex account without violating drawdown rules?",
      },
      {
        id: "forex-msg-002",
        chatId: forexChat.id,
        role: "assistant",
        content:
          "Focus on strict risk per trade, consistency, and protecting daily loss limits before chasing growth.",
      },
    ],
  });

  console.log("✓ Added messages to Forex chat");

  // Create standalone Chat: SaaS Launch
  const saasChat = await prisma.chat.upsert({
    where: { id: "saas-chat-001" },
    update: {},
    create: {
      id: "saas-chat-001",
      title: "Build My SaaS Launch Plan",
      summary: "Launch strategy for a profitable AI SaaS product.",
      projectId: null, // Standalone chat
      isPinned: false,
      isArchived: false,
    },
  });

  console.log("✓ Created chat:", saasChat.title);

  // Add messages to SaaS chat
  await prisma.message.deleteMany({
    where: { chatId: saasChat.id },
  });

  await prisma.message.createMany({
    data: [
      {
        id: "saas-msg-001",
        chatId: saasChat.id,
        role: "user",
        content: "Give me a lean launch strategy for my AI product.",
      },
      {
        id: "saas-msg-002",
        chatId: saasChat.id,
        role: "assistant",
        content:
          "Start with one painful niche problem, validate demand quickly, and iterate weekly.",
      },
    ],
  });

  console.log("✓ Added messages to SaaS chat");
  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
