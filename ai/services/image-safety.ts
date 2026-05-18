import type { RetrievedImage, ProviderImage } from "../tools/image-types";

export async function assessSafety(images: ProviderImage[] | RetrievedImage[]) {
  // Placeholder heuristic safety checks. Returns map id -> safetyScore (0-1)
  const out: Record<string, number> = {};

  for (const img of images) {
    const url = (img as any).url || "";
    const lower = url.toLowerCase();

    // Hard blocks
    if (/\b(porn|nsfw|sex|xxx)\b/.test(lower)) {
      out[img.id] = 0;
      continue;
    }

    // Low-confidence heuristics
    if (lower.endsWith(".svg")) {
      out[img.id] = 0.6;
      continue;
    }

    // Watermark-ish detection: provider names or query params
    if (/watermark|gstatic|doubleclick|q=logo/.test(lower)) {
      out[img.id] = 0.4;
      continue;
    }

    // GIFs may be less desirable for static contexts
    if (lower.endsWith(".gif")) {
      out[img.id] = 0.7;
      continue;
    }

    // Default: high safety
    out[img.id] = 1;
  }

  return out;
}
