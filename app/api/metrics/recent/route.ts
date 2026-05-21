import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET() {
  const client = getRedisClient();
  if (!client) {
    return NextResponse.json({ error: 'redis_not_configured' }, { status: 503 });
  }

  try {
    // Get metric keys (recently used)
    const keys = await client.keys('metrics:*');
    const result: Record<string, unknown[]> = {};

    // Limit to 50 keys to avoid large responses
    const limited = keys.slice(0, 50);
    for (const key of limited) {
      try {
        const items = await client.lrange(key, 0, 99);
        result[key.replace(/^metrics:/, '')] = items.map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return s;
          }
        });
      } catch {
        // ignore per-key errors
      }
    }

    return NextResponse.json({ metrics: result });
  } catch (err) {
    return NextResponse.json({ error: 'metrics_read_failed', detail: String(err) }, { status: 500 });
  }
}
