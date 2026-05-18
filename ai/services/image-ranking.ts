import type { ProviderImage, ImageSearchInput, RetrievedImage } from "../tools/image-types";

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function lexicalScore(query: string, text: string): number {
  const q = new Set(tokenize(query));
  const toks = tokenize(text);
  if (q.size === 0 || toks.length === 0) return 0;
  let overlap = 0;
  for (const t of toks) if (q.has(t)) overlap++;
  return overlap / Math.sqrt(q.size * toks.length);
}

function normalizeUrl(u?: string): string {
  if (!u) return "";
  try {
    const url = new URL(u);
    url.search = "";
    return url.toString();
  } catch {
    return u;
  }
}

export function rankImages(
  providerImages: ProviderImage[],
  input: ImageSearchInput,
): RetrievedImage[] {
  const seen = new Set<string>();
  const imgs = providerImages
    .map((p, idx) => {
      const norm = normalizeUrl(p.url);
      const titleOrUrl = (p.title || p.url || "").toString();
      const rel = lexicalScore(input.query, titleOrUrl) || (1 - idx / Math.max(providerImages.length, 1));
      const resolution = (p.width || 0) * (p.height || 0) || 0;
      // aspect bonus
      let aspectBonus = 0;
      if (input.aspectRatio && p.width && p.height) {
        const aspect = p.width / p.height;
        if (input.aspectRatio === "landscape" && aspect >= 1.2) aspectBonus = 0.05;
        if (input.aspectRatio === "portrait" && aspect <= 0.8) aspectBonus = 0.05;
        if (input.aspectRatio === "square" && Math.abs(aspect - 1) < 0.2) aspectBonus = 0.06;
      }

      const score = Math.min(1, Math.max(0, rel * 0.7 + (Math.log10(Math.max(1, resolution)) / 10) * 0.25 + aspectBonus));

      return { p, norm, score };
    })
    .filter((x) => {
      if (seen.has(x.norm)) return false;
      seen.add(x.norm);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => {
      const p = x.p;
      const ret: RetrievedImage = {
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        title: p.title,
        sourcePage: p.sourcePage,
        width: p.width,
        height: p.height,
        provider: p.provider,
        relevanceScore: x.score,
        safetyScore: 1,
        metadata: {},
      };
      return ret;
    });

  return imgs.slice(0, Math.min(input.count ?? 6, imgs.length));
}
