import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET() {
  const client = getRedisClient();
  if (!client) {
    return NextResponse.json({ error: 'redis_not_configured' }, { status: 503 });
  }

  try {
    // Use non-blocking SCAN to find metric keys without blocking Redis
    const result: Record<string, unknown[]> = {};

    const limitedKeys: string[] = [];
    // Prefer scanIterator when available to iterate asynchronously
    try {
      // Use a small local interface to avoid `any` while supporting multiple Redis clients
      const rc = client as unknown as {
        scanIterator?: (opts?: Record<string, unknown>) => AsyncIterable<string>;
        scan?: (cursor: string, ...args: string[]) => Promise<[string, string[]]>;
      };

      if (rc.scanIterator && typeof rc.scanIterator === "function") {
        const iterator = rc.scanIterator({ MATCH: "metrics:*", COUNT: 100 });
        for await (const k of iterator) {
          limitedKeys.push(k as string);
          if (limitedKeys.length >= 50) break;
        }
      } else {
        // Fallback: use manual SCAN loop
        let cursor = "0";
        const fallbackScanResult: [string, string[]] = ["0", []];
        do {
          const res = await (rc.scan
            ? rc.scan(cursor, "MATCH", "metrics:*", "COUNT", "100")
            : Promise.resolve(fallbackScanResult));
          cursor = res[0];
          const found = res[1] ?? [];
          for (const k of found) {
            limitedKeys.push(k);
            if (limitedKeys.length >= 50) break;
          }
        } while (cursor !== "0" && limitedKeys.length < 50);
      }

    } catch (scanErr) {
      // If scanning fails, return an error response
      return NextResponse.json({ error: 'metrics_scan_failed', detail: String(scanErr) }, { status: 500 });
    }

    // Limit to 50 keys to avoid large responses
    for (const key of limitedKeys) {
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
