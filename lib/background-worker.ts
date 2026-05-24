import prisma from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";
import { dequeueJob, completeJob, requeueJobWithBackoff, type Job, type SaveMessagesJobData, type GenerateTitleJobData, type ProcessAttachmentJobData } from "@/lib/job-queue";
import { error as logError, info } from "@/lib/logger";
import { startTimer, endTimer } from "@/lib/metrics";
import { HumanMessage } from "@langchain/core/messages";
import { createGeminiModel } from "@/ai/models";
import { TITLE_GENERATION_PROMPT } from "@/ai/prompts/title";
import { toTextContent } from "@/ai/graph/stream-consumer";
import { isGenericChatTitle, publishChatTitleUpdate } from "@/lib/chat-title-events";
import { ensureAttachmentParsed } from "@/lib/attachment-processing";
// buildLangSmithRunConfig not needed in worker

/**
 * Background job worker: Processes queued jobs asynchronously.
 *
 * Jobs handled:
 * - saveMessages: Persist chat/message records to database
 * - generateTitle: Generate and save chat titles
 * - enrichContext: Load and store enriched context for future turns
 */

async function processSaveMessagesJob(job: Job<SaveMessagesJobData>): Promise<void> {
  const { data } = job;
  const timer = startTimer("process_save_messages", { chatId: data.chatId });

  try {
    await persistSaveMessagesJobData(data);

    info("job_saveMessages_completed", {
      jobId: job.id,
      chatId: data.chatId,
      runId: data.runId,
    });

    await completeJob(job.id, "saveMessages");
  } catch (err) {
    logError("job_saveMessages_failed", { jobId: job.id, chatId: data.chatId, error: err });
    await requeueJobWithBackoff(job);
  } finally {
    void endTimer(timer);
  }
}

export async function persistSaveMessagesJobData(
  data: SaveMessagesJobData,
): Promise<{ userMessageId: string | null; assistantMessageId: string | null }> {
  const now = new Date();

  await prisma.chat.upsert({
    where: { id: data.chatId },
    create: {
      id: data.chatId,
      title: data.generatedTitle?.trim() || "New Chat",
    },
    update: {},
  });

  const legacyMedia =
    data.media && typeof data.media === "object"
      ? (data.media as Record<string, unknown>)
      : null;
  const userMedia =
    data.userMedia ??
    (legacyMedia?.attachments ? { attachments: legacyMedia.attachments } : undefined);
  const assistantMedia =
    data.assistantMedia ??
    (legacyMedia?.imageBlock ? { imageBlock: legacyMedia.imageBlock } : undefined);

  let createdUserMessageId: string | null = null;
  if (!data.skipUserCreate) {
    const userMessagePayload = {
      chatId: data.chatId,
      role: "user" as const,
      content: data.userMessage ?? "",
      parentId: data.parentMessageId,
      branchId: data.branchId ?? undefined,
      ...(userMedia ? { media: userMedia } : {}),
    };

    if (data.userMessageId) {
      const userMessage = await prisma.message.upsert({
        where: { id: data.userMessageId },
        create: { id: data.userMessageId, ...userMessagePayload },
        update: userMessagePayload,
      });
      createdUserMessageId = userMessage.id;
    } else {
      const userMessage = await prisma.message.create({
        data: userMessagePayload,
      });
      createdUserMessageId = userMessage.id;
    }
  }

  const assistantData = {
    chatId: data.chatId,
    role: "assistant" as const,
    content: data.assistantMessage ?? "",
    parentId: createdUserMessageId ?? data.parentMessageId ?? undefined,
    branchId: data.branchId ?? undefined,
    modelUsed: data.modelUsed,
    provider: "openrouter" as const,
    tokensInput: data.inputTokens,
    tokensOutput: data.outputTokens,
    latencyMs: data.latencyMs,
    runId: data.runId,
    traceId: data.traceId,
    ...(assistantMedia ? { media: assistantMedia } : {}),
  };

  let persistedAssistantMessageId = data.assistantMessageId ?? null;
  if (data.assistantMessageId) {
    const assistantMessage = await prisma.message.upsert({
      where: { id: data.assistantMessageId },
      create: {
        id: data.assistantMessageId,
        ...assistantData,
      },
      update: assistantData,
    });
    persistedAssistantMessageId = assistantMessage.id;
  } else {
    const assistantMessage = await prisma.message.create({
      data: assistantData,
    });
    persistedAssistantMessageId = assistantMessage.id;
  }

  const chatUpdateData: Record<string, unknown> = {
    lastMessageAt: now,
  };
  if (data.generatedTitle) {
    chatUpdateData.title = data.generatedTitle;
  }

  await prisma.chat.update({
    where: { id: data.chatId },
    data: chatUpdateData,
  });

  await prisma.chatRunAnalytics.upsert({
    where: { runId: data.runId },
    update: {
      chatId: data.chatId,
      modelUsed: data.modelUsed,
      provider: "openrouter",
      latencyMs: data.latencyMs,
      tokensInput: data.inputTokens,
      tokensOutput: data.outputTokens,
      traceId: data.traceId,
      status: "completed",
    },
    create: {
      chatId: data.chatId,
      modelUsed: data.modelUsed,
      provider: "openrouter",
      latencyMs: data.latencyMs,
      tokensInput: data.inputTokens,
      tokensOutput: data.outputTokens,
      runId: data.runId,
      traceId: data.traceId,
      status: "completed",
    },
  });

  return {
    userMessageId: createdUserMessageId,
    assistantMessageId: persistedAssistantMessageId,
  };
}

async function processGenerateTitleJob(job: Job<GenerateTitleJobData>): Promise<void> {
  const { data } = job;
  const timer = startTimer("process_generate_title", { chatId: data.chatId });

  try {
    const existingChat = await prisma.chat.findUnique({
      where: { id: data.chatId },
      select: { title: true },
    });

    if (existingChat && !isGenericChatTitle(existingChat.title)) {
      info("job_generateTitle_skipped_existing_title", {
        jobId: job.id,
        chatId: data.chatId,
        runId: data.runId,
        title: existingChat.title,
      });
      await completeJob(job.id, "generateTitle");
      return;
    }

    const model = createGeminiModel();
    const parts: string[] = [];
    if (typeof data.recentConversation === "string" && data.recentConversation.trim().length > 0) {
      parts.push(data.recentConversation.trim());
    }
    if (typeof data.userMessage === "string" && data.userMessage.trim().length > 0) {
      parts.push(`User: ${data.userMessage.trim()}`);
    }
    if (typeof data.assistantMessage === "string" && data.assistantMessage.trim().length > 0) {
      parts.push(`Assistant: ${data.assistantMessage.trim()}`);
    }

    const conversationContext = parts.join("\n");

    let prompt = TITLE_GENERATION_PROMPT.replace("{CONVERSATION_CONTEXT}", conversationContext);

    const contextParts: string[] = [];
    if (data.projectContext) {
      contextParts.push(`Project context: ${toTextContent(data.projectContext)}`);
    }
    if (data.chatSummary) {
      contextParts.push(`Chat summary: ${toTextContent(data.chatSummary)}`);
    }
    if (data.memorySummary) {
      contextParts.push(`Relevant memory: ${toTextContent(data.memorySummary)}`);
    }

    if (contextParts.length > 0) {
      prompt += `\n\nContext:\n${contextParts.join("\n\n")}\n\nUse this context when creating a concise, descriptive title.`;
    }

    // Mock buildLangSmithRunConfig - adjust if needed
    const runConfig = {
      runName: `forge.title-generation-bg`,
      tags: [`phase:title-generation`, `background:true`],
      metadata: { chatId: data.chatId, runId: data.runId },
    };

    const response = await model.invoke([new HumanMessage(prompt)], runConfig);
    const generatedTitle = toTextContent(response.content)
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/[—–-].*$/, "")
      .replace(/\b(straight to the point|quick take|in brief|explained simply)\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[^\p{L}\p{N}\s'-]/gu, "")
      .trim();

    if (generatedTitle) {
      await prisma.chat.update({
        where: { id: data.chatId },
        data: { title: generatedTitle },
      });

      await publishChatTitleUpdate({
        chatId: data.chatId,
        title: generatedTitle,
      });
    }

    info("job_generateTitle_completed", {
      jobId: job.id,
      chatId: data.chatId,
      runId: data.runId,
      titleLength: generatedTitle.length,
    });

    await completeJob(job.id, "generateTitle");
  } catch (err) {
    logError("job_generateTitle_failed", { jobId: job.id, chatId: data.chatId, error: err });
    await requeueJobWithBackoff(job);
  } finally {
    void endTimer(timer);
  }
}

async function processAttachmentJob(job: Job<ProcessAttachmentJobData>): Promise<void> {
  const { data } = job;
  const timer = startTimer("process_attachment", { chatId: data.chatId, attachmentId: data.attachmentId });

  try {
    const attachment = await prisma.attachment.findFirst({
      where: { id: data.attachmentId, chatId: data.chatId },
    });

    if (!attachment) {
      throw new Error(`Attachment ${data.attachmentId} not found for chat ${data.chatId}`);
    }

    await ensureAttachmentParsed({
      id: attachment.id,
      chatId: attachment.chatId,
      name: attachment.name,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      storageUrl: attachment.storageUrl,
      storagePath: attachment.storagePath,
      checksum: attachment.checksum,
      kind: attachment.kind,
      status: attachment.status,
      extractedText: attachment.extractedText,
      summary: attachment.summary,
      pageCount: attachment.pageCount,
      width: attachment.width,
      height: attachment.height,
      language: attachment.language,
      createdAt: attachment.createdAt,
    }, { forceOcr: Boolean(data.requireOcr) });

    info("job_processAttachment_completed", {
      jobId: job.id,
      chatId: data.chatId,
      attachmentId: data.attachmentId,
    });

    await completeJob(job.id, "processAttachment");
  } catch (err) {
    logError("job_processAttachment_failed", {
      jobId: job.id,
      chatId: data.chatId,
      attachmentId: data.attachmentId,
      error: err,
    });
    await requeueJobWithBackoff(job);
  } finally {
    void endTimer(timer);
  }
}

// Enrich/extract background handlers removed; those jobs are no longer queued.

/**
 * Main worker loop: Continuously process jobs from the queue.
 * Each job type is processed by its own worker.
 */
async function startWorkerForQueue<T>(
  jobType: "saveMessages" | "generateTitle" | "processAttachment",
  processor: (job: Job<T>) => Promise<void>,
): Promise<void> {
  while (!workersStopping) {
    try {
      const job = await dequeueJob(jobType, workersStopping ? 1 : 30);
      if (!job) {
        if (workersStopping) {
          break;
        }
        // Queue empty, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      await processor(job as unknown as Job<T>);
    } catch (err) {
      if (workersStopping) {
        break;
      }
      logError("worker_error", { jobType, error: err });
      // Continue processing despite errors
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

/**
 * Initialize background workers for all job types.
 * Call this once at server startup (or lazily on first use).
 * Safe to call multiple times - uses a module-level guard to prevent duplicate initialization.
 */
let workersInitialized = false;
let workersStopping = false;
let workerLoopPromises: Promise<void>[] = [];

export type BackgroundWorkerHandle = {
  shutdown: (options?: { timeoutMs?: number }) => Promise<void>;
};

async function waitForWorkerLoops(timeoutMs: number): Promise<void> {
  if (workerLoopPromises.length === 0) {
    return;
  }

  await Promise.race([
    Promise.allSettled(workerLoopPromises),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`worker shutdown timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function shutdownBackgroundWorkers(options?: { timeoutMs?: number }): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 30_000;

  if (workersStopping) {
    return;
  }

  workersStopping = true;
  info("background_workers_shutdown_requested", { timeoutMs });

  try {
    await waitForWorkerLoops(timeoutMs);
    info("background_workers_shutdown_completed", { timeoutMs });
  } catch (error) {
    logError("background_workers_shutdown_failed", { error, timeoutMs });
    throw error;
  }
}

export async function initializeBackgroundWorkers(): Promise<BackgroundWorkerHandle> {
  if (workersInitialized) {
    return {
      shutdown: shutdownBackgroundWorkers,
    };
  }

  const redis = getRedisClient();
  if (!redis) {
    throw new Error("REDIS_URL is required to start background workers.");
  }

  await redis.ping();

  workersInitialized = true;
  workersStopping = false;

  // Start workers for each job type (fire and forget)
  workerLoopPromises = [
    startWorkerForQueue("saveMessages", processSaveMessagesJob),
    startWorkerForQueue("generateTitle", processGenerateTitleJob),
    startWorkerForQueue("processAttachment", processAttachmentJob),
  ];

  info("background_workers_initialized", {
    jobTypes: ["saveMessages", "generateTitle", "processAttachment"],
  });

  return {
    shutdown: shutdownBackgroundWorkers,
  };
}

// Export for testing
export { processSaveMessagesJob, processGenerateTitleJob, processAttachmentJob };
