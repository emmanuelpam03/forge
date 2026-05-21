import type { ProviderImage } from "../image-types";
import { cacheGet, cacheSet } from "@/lib/redis";
import fetchWithTimeout from "@/lib/fetchWithTimeout";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";

export async function pexelsSearch(query: string, count: number = 6): Promise<ProviderImage[]> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return [];

  const cacheKey = `pexels:images:${encodeURIComponent(query)}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const all = JSON.parse(cached) as ProviderImage[];
      return all.slice(0, count);
    }
  } catch {}

  const perPage = Math.min(Math.max(count, 1), 80);
  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
  });

  try {
    const res = await fetchWithTimeout(`${PEXELS_SEARCH}?${params.toString()}`, {
      headers: { Authorization: key },
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const photos = payload.photos || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgs: ProviderImage[] = photos.map((p: any) => ({
      id: String(p.id),
      url: p.src?.large2x || p.src?.large || p.src?.original || undefined,
      thumbnailUrl: p.src?.medium || p.src?.small || p.src?.tiny || undefined,
      title: p.alt || p.photographer || undefined,
      sourcePage: p.url || undefined,
      width: p.width || undefined,
      height: p.height || undefined,
      provider: "pexels",
      metadata: {
        photographer: p.photographer,
        photographer_url: p.photographer_url,
      },
    }));

    try {
      // Cache the full fetched array (up to perPage) so future requests
      // with different counts can slice from the cached set.
      await cacheSet(cacheKey, JSON.stringify(imgs), 3600);
    } catch {}

    return imgs.slice(0, count);
  } catch {
    return [];
  }
}
