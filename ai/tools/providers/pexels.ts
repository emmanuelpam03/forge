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

    const imgs: ProviderImage[] = photos.map((p: unknown) => {
      const obj = p as Record<string, unknown>;
      const src = obj.src as Record<string, unknown> | undefined;
      const id = obj.id !== undefined ? String(obj.id) : "";
      const url = (src?.large2x ?? src?.large ?? src?.original) as string | undefined;
      const thumbnailUrl = (src?.medium ?? src?.small ?? src?.tiny) as string | undefined;
      const title = (obj.alt ?? obj.photographer) as string | undefined;
      const sourcePage = obj.url as string | undefined;
      const width = typeof obj.width === "number" ? (obj.width as number) : undefined;
      const height = typeof obj.height === "number" ? (obj.height as number) : undefined;

      return {
        id: id,
        url,
        thumbnailUrl,
        title,
        sourcePage,
        width,
        height,
        provider: "pexels",
        metadata: {
          photographer: obj.photographer as string | undefined,
          photographer_url: obj.photographer_url as string | undefined,
        },
      };
    });

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
