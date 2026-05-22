import type { ProviderImage } from "../image-types";
import { cacheGet, cacheSet } from "@/lib/redis";
import fetchWithTimeout from "@/lib/fetchWithTimeout";

const SERPAPI_BASE = "https://serpapi.com/search";

export async function serpapiImageSearch(query: string, count: number = 6): Promise<ProviderImage[]> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) return [];

  const cacheKey = `serpapi:images:${encodeURIComponent(query)}:${count}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ProviderImage[];
    }
  } catch {
    // ignore cache errors
  }

  const params = new URLSearchParams({
    engine: "google_images",
    q: query,
    api_key: key,
    num: String(Math.min(Math.max(count, 1), 100)),
  });

  const url = `${SERPAPI_BASE}?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const payload = await res.json();
    const items = payload.images_results || payload.image_results || [];

    const imgs: ProviderImage[] = items.map((it: unknown, idx: number) => {
      const obj = it as Record<string, unknown>;
      const id = String(obj.id ?? obj.position ?? obj.source ?? obj.original ?? idx);
      const url = (obj.original ?? obj.source ?? obj.link ?? obj.thumbnail ?? obj.url) as string | undefined;
      const thumbnailUrl = (obj.thumbnail ?? obj.thumbnail_link ?? obj.tbn ?? obj.thumb ?? obj.original ?? obj.url) as string | undefined;
      const title = (obj.title ?? obj.alt) as string | undefined;
      const sourcePage = (obj.context ?? obj.source ?? obj.link) as string | undefined;
      const width = typeof obj.width === "number" ? (obj.width as number) : undefined;
      const height = typeof obj.height === "number" ? (obj.height as number) : undefined;

      return {
        id,
        url,
        thumbnailUrl,
        title,
        sourcePage,
        width,
        height,
        provider: "serpapi",
      };
    });

    // cache for 1 hour
    try {
      await cacheSet(cacheKey, JSON.stringify(imgs), 3600);
    } catch {}

    return imgs.slice(0, count);
  } catch {
    return [];
  }
}
