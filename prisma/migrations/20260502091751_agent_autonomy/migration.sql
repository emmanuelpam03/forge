-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('scheduled', 'conditional', 'one_time');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending_approval', 'approved', 'queued', 'running', 'completed', 'canceled', 'rejected', 'failed');

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chatId" TEXT,
    "sourceMessageId" TEXT,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending_approval',
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduleSpec" TEXT,
    "conditionText" TEXT,
    "oneTimeAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_projectId_idx" ON "task"("projectId");

-- CreateIndex
CREATE INDEX "task_chatId_idx" ON "task"("chatId");

-- CreateIndex
CREATE INDEX "task_status_idx" ON "task"("status");

-- CreateIndex
CREATE INDEX "task_type_idx" ON "task"("type");

-- CreateIndex
CREATE INDEX "task_oneTimeAt_idx" ON "task"("oneTimeAt");

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
