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
    const imgs: ProviderImage[] = results.map((r: unknown) => {
      const obj = r as Record<string, unknown>;
      const urls = obj.urls as Record<string, unknown> | undefined;
      const links = obj.links as Record<string, unknown> | undefined;

      return {
        id: obj.id as string,
        url: (urls?.regular ?? urls?.full ?? urls?.raw) as string | undefined,
        thumbnailUrl: (urls?.thumb ?? urls?.small ?? urls?.regular) as string | undefined,
        title: (obj.description ?? obj.alt_description) as string | undefined,
        sourcePage: links?.html as string | undefined,
        width: typeof obj.width === "number" ? (obj.width as number) : undefined,
        height: typeof obj.height === "number" ? (obj.height as number) : undefined,
        provider: "unsplash",
      };
    });

    try {
      await cacheSet(cacheKey, JSON.stringify(imgs), 3600);
    } catch {}

    return imgs.slice(0, count);
  } catch {
    return [];
  }
}
