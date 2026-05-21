import { info, error as logError } from "@/lib/logger";

const shutdown = (signal: NodeJS.Signals) => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  info("background_worker_shutdown_requested", { signal });
  process.exit(0);
};

let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

async function main() {
  if (!process.env.DATABASE_URL) {
    logError("background_worker_missing_database_url", {
      message: "DATABASE_URL is required to start the standalone worker.",
    });
    process.exit(1);
  }

  const { initializeBackgroundWorkers } = await import("@/lib/background-worker");

  info("background_worker_starting", { pid: process.pid });
  initializeBackgroundWorkers();

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  process.on("unhandledRejection", (error) => {
    logError("background_worker_unhandled_rejection", { error });
  });

  process.on("uncaughtException", (error) => {
    logError("background_worker_uncaught_exception", { error });
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