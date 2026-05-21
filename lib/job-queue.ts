import "server-only";

import { getRedisClient } from "./redis";
import { error as logError, info, debug } from "./logger";

/**
 * Simple Redis-backed background job queue.
 * Provides fire-and-forget async job execution with exponential backoff.
 *
 * Uses Redis lists (LPUSH/BRPOP) for simplicity and availability.
 * Jobs are persisted until processed successfully.
 */

export type JobType = "saveMessages" | "generateTitle" | "enrichContext" | "extractMemory";

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  data: T;
  retries: number;
  maxRetries: number;
  createdAt: number;
  processedAt?: number;
}

type QueueJobProcessingStats = {
  sampleCount: number;
  averageMs: number | null;
  latestMs: number | null;
};

function getProcessingMetricName(type: JobType): string | null {
  switch (type) {
    case "saveMessages":
      return "process_save_messages";
    case "generateTitle":
      return "process_generate_title";
    case "enrichContext":
      return "process_enrich_context";
    case "extractMemory":
      return "process_extract_memory";
    default:
      return null;
  }
}

async function readRecentProcessingStats(
  redis: ReturnType<typeof getRedisClient>,
  type: JobType,
): Promise<QueueJobProcessingStats> {
  const metricName = getProcessingMetricName(type);
  if (!redis || !metricName) {
    return { sampleCount: 0, averageMs: null, latestMs: null };
  }

  try {
    const metricKey = `metrics:${metricName}`;
    const entries = await redis.lrange(metricKey, 0, 19);
    const values = entries
      .map((entry) => {
        try {
          const parsed = JSON.parse(entry) as { value?: unknown };
          return typeof parsed.value === "number" ? parsed.value : null;
        } catch {
          return null;
        }
      })
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return { sampleCount: 0, averageMs: null, latestMs: null };
    }

    const sum = values.reduce((total, value) => total + value, 0);
    return {
      sampleCount: values.length,
      averageMs: Math.round(sum / values.length),
      latestMs: values[0] ?? null,
    };
  } catch (err) {
    logError("read_processing_stats_failed", { type, error: err });
    return { sampleCount: 0, averageMs: null, latestMs: null };
  }
}

export interface SaveMessagesJobData {
  chatId: string;
  userMessage: string | null;
  assistantMessage: string | null;
  assistantMessageId: string | null | undefined;
  userMessageId?: string | null;
  parentMessageId: string | null;
  branchId: string | undefined | null;
  skipUserCreate: boolean;
  modelUsed: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  runId: string;
  traceId: string | null;
  generatedTitle?: string;
}

export interface GenerateTitleJobData {
  chatId: string;
  userMessage: string;
  assistantMessage: string;
  projectContext?: string | null;
  chatSummary?: string | null;
  // Memory summary can be structured; accept unknown to avoid tight coupling
  memorySummary?: unknown | null;
  runId: string;
}

export interface EnrichContextJobData {
  chatId: string;
  runId: string;
}

/**
 * Queue a background job for async processing.
 * Returns immediately with job ID; processing happens asynchronously.
 */
export async function queueJob<T>(
  type: JobType,
  data: T,
  maxRetries: number = 3,
): Promise<string> {
  const redis = getRedisClient();
  if (!redis) {
    // Fallback: If Redis is unavailable, log error but don't crash
    logError("redis_unavailable_cannot_queue_job", { type });
    return "no-redis";
  }

  const jobId = crypto.randomUUID();
  const job: Job<T> = {
    id: jobId,
    type,
    data,
    retries: 0,
    maxRetries,
    createdAt: Date.now(),
  };

  try {
    const queueKey = `queue:${type}`;
    // Add job to queue as JSON
    await redis.lpush(queueKey, JSON.stringify(job));

    // Set queue expiration to prevent memory leak if processor crashes
    // Queue is kept for 7 days
    await redis.expire(queueKey, 7 * 24 * 60 * 60);

    debug("job_queued", { jobId, type });
    return jobId;
  } catch (err) {
    logError("queue_job_failed", { jobId, type, error: err });
    return jobId; // Return ID anyway; job is lost but request shouldn't fail
  }
}

/**
 * Dequeue a single job for processing.
 * Blocks up to timeoutSeconds waiting for a job to appear.
 */
export async function dequeueJob(
  type: JobType,
  timeoutSeconds: number = 30,
): Promise<Job | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const queueKey = `queue:${type}`;
    const delayedKey = `delayed:${type}`;

    const claimDueDelayedJob = async (): Promise<Job | null> => {
      const jobJson = (await redis.eval(
        `local delayedKey = KEYS[1]\nlocal now = tonumber(ARGV[1])\nlocal jobs = redis.call("ZRANGEBYSCORE", delayedKey, "-inf", now, "LIMIT", 0, 1)\nif #jobs == 0 then return nil end\nredis.call("ZREM", delayedKey, jobs[1])\nreturn jobs[1]`,
        1,
        delayedKey,
        Date.now().toString(),
      )) as string | null;

      if (!jobJson) {
        return null;
      }

      return JSON.parse(jobJson) as Job;
    };

    const nextDelayedAt = async (): Promise<number | null> => {
      const next = (await redis.zrange(delayedKey, 0, 0, "WITHSCORES")) as string[];
      if (!next || next.length < 2) {
        return null;
      }

      const scheduledAt = Number(next[1]);
      return Number.isFinite(scheduledAt) ? scheduledAt : null;
    };

    const dueDelayedJob = await claimDueDelayedJob();
    if (dueDelayedJob) {
      return dueDelayedJob;
    }

    const nextScheduledAt = await nextDelayedAt();
    const waitSeconds =
      nextScheduledAt !== null
        ? Math.max(1, Math.min(timeoutSeconds, Math.ceil((nextScheduledAt - Date.now()) / 1000)))
        : timeoutSeconds;

    // BRPOP blocks until a job is available or timeout expires
    const result = await redis.brpop(queueKey, waitSeconds);

    if (!result || result.length < 2) {
      return await claimDueDelayedJob();
    }

    const raw = result[1] as string;
    const parsedJob = JSON.parse(raw) as Job & { scheduledAt?: number };

    // Legacy support: if a scheduled job is still sitting in the immediate queue,
    // move it into the delayed sorted set and let the next dequeue attempt pick it up.
    if (parsedJob.scheduledAt && Date.now() < parsedJob.scheduledAt) {
      try {
        await redis.zadd(delayedKey, parsedJob.scheduledAt, raw);
        await redis.expire(delayedKey, 7 * 24 * 60 * 60);
        debug("job_not_ready_requeued", { jobId: parsedJob.id, scheduledAt: parsedJob.scheduledAt });
      } catch (err) {
        logError("requeue_scheduled_job_failed", { error: err, jobId: parsedJob.id });
      }

      // Indicate no ready job was returned (caller may wait or retry)
      return null;
    }

    return parsedJob;
  } catch (err) {
    logError("dequeue_job_failed", { type, error: err });
    return null;
  }
}

/**
 * Mark a job as successful and remove from queue.
 */
export async function completeJob(jobId: string, type: JobType): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    // Record completion in completed set for metrics/debugging
    const completedKey = `completed:${type}`;
    await redis.lpush(completedKey, jobId);
    // Keep last 100 completed jobs
    await redis.ltrim(completedKey, 0, 99);
    // Set TTL to expire old entries
    await redis.expire(completedKey, 24 * 60 * 60);

    debug("job_completed", { jobId, type });
  } catch (err) {
    logError("complete_job_failed", { jobId, type, error: err });
  }
}

/**
 * Requeue a failed job with exponential backoff.
 * If max retries exceeded, move to dead-letter queue.
 */
export async function requeueJobWithBackoff(
  job: Job,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    job.retries += 1;
    await redis.incr(`retries:${job.type}`);

    if (job.retries >= job.maxRetries) {
      // Move to dead-letter queue
      const dlqKey = `dlq:${job.type}`;
      await redis.lpush(dlqKey, JSON.stringify(job));
      await redis.expire(dlqKey, 7 * 24 * 60 * 60);

      logError("job_max_retries_exceeded", {
        jobId: job.id,
        type: job.type,
        retries: job.retries,
      });
      return;
    }

    // Exponential backoff: 2^retries seconds
    const backoffSeconds = Math.pow(2, job.retries);

    // Re-queue into a delayed sorted set so workers don't keep popping the same
    // job before its scheduled time.
    const delayedKey = `delayed:${job.type}`;
    const delayedJob = { ...job, scheduledAt: Date.now() + backoffSeconds * 1000 };
    await redis.zadd(delayedKey, delayedJob.scheduledAt, JSON.stringify(delayedJob));
    await redis.expire(delayedKey, 7 * 24 * 60 * 60);

    info("job_requeued_with_backoff", {
      jobId: job.id,
      type: job.type,
      retries: job.retries,
      backoffSeconds,
    });
  } catch (err) {
    logError("requeue_job_failed", { jobId: job.id, type: job.type, error: err });
  }
}

/**
 * Get queue metrics for monitoring.
 */
export async function getQueueMetrics(): Promise<Record<string, unknown>> {
  const redis = getRedisClient();
  if (!redis) {
    return { available: false };
  }

  try {
    const types: JobType[] = ["saveMessages", "generateTitle", "enrichContext", "extractMemory"];
    const metrics: Record<string, unknown> = { available: true };

    for (const type of types) {
      const queueKey = `queue:${type}`;
      const dlqKey = `dlq:${type}`;
      const completedKey = `completed:${type}`;
      const retryKey = `retries:${type}`;

      const queueLength = await redis.llen(queueKey);
      const dlqLength = await redis.llen(dlqKey);
      const completedCount = await redis.llen(completedKey);
      const retryCount = Number((await redis.get(retryKey)) ?? 0);
      const processingStats = await readRecentProcessingStats(redis, type);

      metrics[type] = {
        queued: queueLength,
        deadLetterCount: dlqLength,
        recentlyCompleted: completedCount,
        retryCount,
        processingTimeMs: processingStats,
      };
    }

    return metrics;
  } catch (err) {
    logError("get_queue_metrics_failed", { error: err });
    return { available: false, error: String(err) };
  }
}

/**
 * Purge a queue entirely (dev/testing only).
 */
export async function purgeQueue(type: JobType): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const queueKey = `queue:${type}`;
    await redis.del(queueKey);
    info("queue_purged", { type });
  } catch (err) {
    logError("purge_queue_failed", { type, error: err });
  }
}
