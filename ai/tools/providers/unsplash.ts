import type { ProviderImage } from "../image-types";
import { cacheGet, cacheSet } from "@/lib/redis";
import fetchWithTimeout from "@/lib/fetchWithTimeout";

const UNSPLASH_API = "https://api.unsplash.com/search/photos";

export async function unsplashSearch(query: string, count: number = 6): Promise<ProviderImage[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return [];

  const cacheKey = `unsplash:images:${encodeURIComponent(query)}:${count}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached) as ProviderImage[];
  } catch {}

  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(Math.max(count, 1), 30)),
  });

  try {
    const res = await fetchWithTimeout(`${UNSPLASH_API}?${params.toString()}`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const results = payload.results || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgs: ProviderImage[] = results.map((r: any) => ({
      id: r.id,
      url: r.urls?.regular || r.urls?.full || r.urls?.raw,
      thumbnailUrl: r.urls?.thumb || r.urls?.small || r.urls?.regular,
      title: r.description || r.alt_description || undefined,
      sourcePage: r.links?.html,
      width: r.width,
      height: r.height,
      provider: "unsplash",
    }));

    try {
      await cacheSet(cacheKey, JSON.stringify(imgs), 3600);
    } catch {}

    return imgs.slice(0, count);
  } catch (_err) {
    return [];
  }
}
