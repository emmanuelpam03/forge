/*
  Warnings:

  - A unique constraint covering the columns `[runId]` on the table `ChatRunAnalytics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ChatRunAnalytics_runId_idx";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "media" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "ChatRunAnalytics_runId_key" ON "ChatRunAnalytics"("runId");
