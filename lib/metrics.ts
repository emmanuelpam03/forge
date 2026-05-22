import { info } from "./logger";
import { getRedisClient } from "./redis";

export type MetricTimer = {
  name: string;
  start: number;
  tags?: Record<string, unknown>;
};

export function startTimer(name: string, tags?: Record<string, unknown>): MetricTimer {
  return { name, start: Date.now(), tags };
}

export async function endTimer(timer: MetricTimer, extra?: Record<string, unknown>) {
  const durationMs = Date.now() - timer.start;
  const payload = {
    metric: `${timer.name}.duration_ms`,
    value: durationMs,
    tags: timer.tags ?? {},
    extra: extra ?? {},
    ts: new Date().toISOString(),
  };

  // Async log for quick local inspection
  try {
    info("metric_recorded", payload);
  } catch {
    // swallow
  }

  // If Redis available, push to a list for short-term aggregation/shipper
  try {
    const redis = getRedisClient();
    if (redis) {
      const key = `metrics:${timer.name}`;
      // Keep recent 100 entries
      await redis.lpush(key, JSON.stringify(payload));
      await redis.ltrim(key, 0, 99);
      // Set short TTL so metrics don't grow indefinitely
      await redis.expire(key, 60 * 60 * 2); // 2 hours
    }
  } catch {
    // swallow errors to avoid impacting request
  }

  return durationMs;
}

export async function recordMetric(name: string, value: number, tags?: Record<string, unknown>) {
  const payload = { metric: name, value, tags: tags ?? {}, ts: new Date().toISOString() };
  try {
    info("metric_recorded", payload);
  } catch {}
  try {
    const redis = getRedisClient();
    if (redis) {
      const key = `metrics:${name}`;
      await redis.lpush(key, JSON.stringify(payload));
      await redis.ltrim(key, 0, 99);
      await redis.expire(key, 60 * 60 * 2);
    }
  } catch {}
}

const Metrics = { startTimer, endTimer, recordMetric };

export default Metrics;
