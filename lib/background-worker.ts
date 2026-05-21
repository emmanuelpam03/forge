import prisma from "@/lib/prisma";
import { dequeueJob, completeJob, requeueJobWithBackoff, type Job, type SaveMessagesJobData, type GenerateTitleJobData, type EnrichContextJobData } from "@/lib/job-queue";
import { error as logError, info } from "@/lib/logger";
import { startTimer, endTimer } from "@/lib/metrics";
import { HumanMessage } from "@langchain/core/messages";
import { createGeminiModel } from "@/ai/models";
import { TITLE_GENERATION_PROMPT } from "@/ai/prompts/title";
import { enrichContextInBackground } from "@/ai/context/engine";
import { toTextContent } from "@/ai/graph/stream-consumer";
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

  let createdUserMessageId: string | null = null;
  if (!data.skipUserCreate) {
    const userMessagePayload = {
      chatId: data.chatId,
      role: "user" as const,
      content: data.userMessage ?? "",
      parentId: data.parentMessageId,
      branchId: data.branchId ?? undefined,
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

  await prisma.chatRunAnalytics.create({
    data: {
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
    const model = createGeminiModel();
    let prompt = TITLE_GENERATION_PROMPT.replace(/"{USER_MESSAGE}"/g, data.userMessage).replace(
      /"{ASSISTANT_MESSAGE}"/g,
      data.assistantMessage,
    );

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
      .toLowerCase()
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

async function processEnrichContextJob(job: Job<EnrichContextJobData>): Promise<void> {
  const { data } = job;
  const timer = startTimer("process_enrich_context", { chatId: data.chatId });

  try {
    // Load full context asynchronously
    await enrichContextInBackground(data.chatId);

    info("job_enrichContext_completed", {
      jobId: job.id,
      chatId: data.chatId,
      runId: data.runId,
    });

    await completeJob(job.id, "enrichContext");
  } catch (err) {
    logError("job_enrichContext_failed", { jobId: job.id, chatId: data.chatId, error: err });
    // Don't requeue context enrichment failures - it's best effort
  } finally {
    void endTimer(timer);
  }
}

/**
 * Placeholder handler for extractMemory jobs.
 * Currently extractMemory is produced inline by the graph; if queued jobs
 * appear in the future this handler will ensure they are acknowledged.
 */
async function processExtractMemoryJob(job: Job<unknown>): Promise<void> {
  const timer = startTimer("process_extract_memory", {});
  try {
    info("process_extract_memory_noop", { jobId: job.id });
    // Acknowledge the job so it doesn't remain pending. If a real handler is
    // needed later, replace this implementation with actual processing logic.
    await completeJob(job.id, "extractMemory");
  } catch (err) {
    logError("job_extractMemory_failed", { jobId: job.id, error: err });
    await requeueJobWithBackoff(job as Job);
  } finally {
    void endTimer(timer);
  }
}

/**
 * Main worker loop: Continuously process jobs from the queue.
 * Each job type is processed by its own worker.
 */
async function startWorkerForQueue<T>(
  jobType: "saveMessages" | "generateTitle" | "enrichContext" | "extractMemory",
  processor: (job: Job<T>) => Promise<void>,
): Promise<void> {
  while (true) {
    try {
      const job = await dequeueJob(jobType, 30);
      if (!job) {
        // Queue empty, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      await processor(job as unknown as Job<T>);
    } catch (err) {
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

export function initializeBackgroundWorkers(): void {
  if (workersInitialized) {
    return;
  }
  workersInitialized = true;

  // Start workers for each job type (fire and forget)
  void startWorkerForQueue("saveMessages", processSaveMessagesJob);
  void startWorkerForQueue("generateTitle", processGenerateTitleJob);
  void startWorkerForQueue("enrichContext", processEnrichContextJob);
  void startWorkerForQueue("extractMemory", processExtractMemoryJob);

  info("background_workers_initialized", {
    jobTypes: ["saveMessages", "generateTitle", "enrichContext", "extractMemory"],
  });
}

// Export for testing
export { processSaveMessagesJob, processGenerateTitleJob, processEnrichContextJob, processExtractMemoryJob };
