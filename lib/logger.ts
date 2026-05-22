import { hashIdentifierForLogging } from "./logging.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Build a structured log entry. This ensures common fields are present and
 * identifier-like fields (ending with `id`) are hashed for privacy.
 */
function buildEntry(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event: message,
    message,
  };

  if (context) {
    for (const [k, v] of Object.entries(context)) {
      if (k.toLowerCase().includes("id") && typeof v === "string") {
        // Hash identifiers to keep logs privacy-safe while enabling correlation
        entry[k] = hashIdentifierForLogging(v as string);
      } else {
        entry[k] = v;
      }
    }
  }

  // Inject canonical `service` metadata unless provided by caller. This helps
  // downstream log consumers to filter/route logs by service name.
  if (!entry.service) {
    // Prefer an explicit env var, fall back to package name if available.
    // This value can be overridden by callers via the `context` argument.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore access optional npm variable
    entry.service = process.env.SERVICE_NAME || (process.env.npm_package_name as string) || "forge";
  }

  return entry;
}

function output(entry: Record<string, unknown>, level: LogLevel) {
  const seen = new WeakSet<object>();
  const line = JSON.stringify(entry, (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "function") {
      return `[Function ${value.name || "anonymous"}]`;
    }

    if (value && typeof value === "object") {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }

    return value;
  });
  // Write logs asynchronously to avoid blocking the request path.
  // Use setImmediate where available; fallback to setTimeout for environments without it.
  const asyncLog = (fn: () => void) => {
    if (typeof setImmediate !== "undefined") {
      setImmediate(fn);
    } else {
      setTimeout(fn, 0);
    }
  };

  if (level === "error") {
    // In tests we emit logs synchronously so test harnesses can capture them.
    if (process.env.NODE_ENV === "test") {
       
      console.error(line);
    } else {
       
      asyncLog(() => console.error(line));
    }
  } else if (level === "warn") {
    if (process.env.NODE_ENV === "test") {
       
      console.warn(line);
    } else {
       
      asyncLog(() => console.warn(line));
    }
  } else {
    if (process.env.NODE_ENV === "test") {
       
      console.info(line);
    } else {
       
      asyncLog(() => console.info(line));
    }
  }
}

export function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = buildEntry(level, message, context);
  output(entry, level);
}

/**
 * Log a named event with standardized metadata.
 * - `eventName` should follow `snake_case` like `chat_started`.
 * - `metadata` may include `route`, `path`, `chatId`, `runId`, etc.
 */
export function event(level: LogLevel, eventName: string, metadata?: Record<string, unknown>) {
  const entry = buildEntry(level, eventName, metadata);
  output(entry, level);
}

export function info(message: string, context?: Record<string, unknown>) {
  return log("info", message, context);
}

export function warn(message: string, context?: Record<string, unknown>) {
  return log("warn", message, context);
}

export function error(message: string, context?: Record<string, unknown>) {
  return log("error", message, context);
}

export function debug(message: string, context?: Record<string, unknown>) {
  return log("debug", message, context);
}
