import type { ProviderImage } from "../image-types";

const WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php";

export async function wikimediaSearch(query: string, count: number = 6): Promise<ProviderImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: query,
    gsrlimit: String(Math.min(Math.max(count, 1), 20)),
    prop: "imageinfo|pageimages|info",
    iiprop: "url|extmetadata",
    piprop: "thumbnail",
    pithumbsize: "600",
  });

  const url = `${WIKIMEDIA_API}?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const payload = await res.json();
    const pages = payload?.query?.pages || {};

    const images: ProviderImage[] = Object.values(pages)
      .map((p: any) => {
        const imageinfo = Array.isArray(p.imageinfo) ? p.imageinfo[0] : undefined;
        const thumbnail = p.thumbnail?.source;
        const url = imageinfo?.url || thumbnail || undefined;
        if (!url) return null;

        return {
          id: String(p.pageid || p.pageId || url),
          url,
          thumbnailUrl: thumbnail || url,
          title: p.title || undefined,
          sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title || "")}`,
          width: imageinfo?.width,
          height: imageinfo?.height,
          provider: "wikimedia",
        } as ProviderImage;
      })
      .filter(Boolean) as ProviderImage[];

    return images.slice(0, count);
  } catch (err) {
    return [];
  }
}
