import { info, error as logError } from "@/lib/logger";
import type { BackgroundWorkerHandle } from "@/lib/background-worker";

let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
let workerHandle: BackgroundWorkerHandle | null = null;
let dbClient: { $disconnect: () => Promise<void> } | null = null;
let shutdownInProgress = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shutdownInProgress) {
    return;
  }
  shutdownInProgress = true;

  const timeoutMs = Number.parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT_MS ?? "30000", 10) || 30_000;

  info("background_worker_shutdown_requested", { signal, timeoutMs });

  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }

  try {
    if (workerHandle) {
      info("background_worker_stop_signaled", { signal });
      await workerHandle.shutdown({ timeoutMs });
    }

    if (dbClient) {
      info("background_worker_db_disconnect_start", { signal });
      await Promise.race([
        dbClient.$disconnect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`database disconnect timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      info("background_worker_db_disconnect_complete", { signal });
    }

    info("background_worker_shutdown_complete", { signal });
    process.exit(0);
  } catch (error) {
    logError("background_worker_shutdown_failed", { signal, error });
    try {
      if (dbClient) {
        await dbClient.$disconnect();
      }
    } catch (disconnectError) {
      logError("background_worker_db_disconnect_failed", { signal, error: disconnectError });
    }
    process.exit(1);
  }
};

async function main() {
  if (!process.env.DATABASE_URL) {
    logError("background_worker_missing_database_url", {
      message: "DATABASE_URL is required to start the standalone worker.",
    });
    process.exit(1);
  }

  const { default: prisma } = await import("@/lib/prisma");
  const { initializeBackgroundWorkers } = await import("@/lib/background-worker");
  dbClient = prisma;

  info("background_worker_starting", { pid: process.pid });
  workerHandle = await initializeBackgroundWorkers();
  info("background_worker_workers_initialized", { pid: process.pid });

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason: unknown, _promise: Promise<unknown>) => {
    void _promise;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logError("background_worker_unhandled_rejection", { error });
    process.exit(1);
  });

  process.on("uncaughtException", (error: Error | unknown) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    logError("background_worker_uncaught_exception", { error: normalizedError });
    process.exit(1);
  });

  keepAliveInterval = setInterval(() => {
    // Keep the event loop alive while the queue consumers run in the background.
  }, 60_000);
}

main().catch((error) => {
  logError("background_worker_boot_failed", { error });
  process.exit(1);
});