import Redis from "ioredis";

let client: Redis | null = null;

export function getRedisClient() {
  if (client) return client;
  const url = process.env.REDIS_URL || process.env.REDIS_TLS_URL || null;
  if (!url) return null;
  try {
    client = new Redis(url);
    return client;
  } catch (err) {
    console.error('[Redis] Failed to create client:', err);
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const c = getRedisClient();
  if (!c) return null;
  try {
    return await c.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 3600) {
  const c = getRedisClient();
  if (!c) return;
  try {
    await c.set(key, value, "EX", ttlSeconds);
  } catch {
    // swallow
  }
}
