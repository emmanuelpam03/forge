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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgs: ProviderImage[] = items.map((it: any, idx: number) => ({
      id: it.id || it.position || it.source || it.original || String(idx),
      url: it.original || it.source || it.link || it.thumbnail || it.url,
      thumbnailUrl: it.thumbnail || it.thumbnail_link || it.tbn || it.thumb || it.original || it.url,
      title: it.title || it.alt || undefined,
      sourcePage: it.context || it.source || it.link || undefined,
      width: it.width || undefined,
      height: it.height || undefined,
      provider: "serpapi",
    }));

    // cache for 1 hour
    try {
      await cacheSet(cacheKey, JSON.stringify(imgs), 3600);
    } catch {}

    return imgs.slice(0, count);
  } catch (_err) {
    return [];
  }
}
