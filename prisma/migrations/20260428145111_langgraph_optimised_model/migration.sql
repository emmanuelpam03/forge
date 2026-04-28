-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system', 'tool');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "summary" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "modelUsed" TEXT,
    "provider" TEXT,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "latencyMs" INTEGER,
    "runId" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorySummary" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRunAnalytics" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "modelUsed" TEXT,
    "provider" TEXT,
    "latencyMs" INTEGER,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "runId" TEXT,
    "traceId" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatRunAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageUrl" TEXT,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Chat_projectId_idx" ON "Chat"("projectId");

-- CreateIndex
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Chat_createdAt_idx" ON "Chat"("createdAt");

-- CreateIndex
CREATE INDEX "Chat_title_idx" ON "Chat"("title");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_runId_idx" ON "Message"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_key_key" ON "Preference"("key");

-- CreateIndex
CREATE INDEX "Preference_category_idx" ON "Preference"("category");

-- CreateIndex
CREATE INDEX "ChatRunAnalytics_chatId_idx" ON "ChatRunAnalytics"("chatId");

-- CreateIndex
CREATE INDEX "ChatRunAnalytics_createdAt_idx" ON "ChatRunAnalytics"("createdAt");

-- CreateIndex
CREATE INDEX "ChatRunAnalytics_runId_idx" ON "ChatRunAnalytics"("runId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_name_idx" ON "Document"("name");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRunAnalytics" ADD CONSTRAINT "ChatRunAnalytics_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
