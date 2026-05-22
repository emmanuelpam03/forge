import type { ProviderImage, ImageSearchInput, RetrievedImage } from "../tools/image-types";

export type ImageSearchGrounding = {
  entity: string;
  category:
    | "landmarks"
    | "culture"
    | "cities"
    | "people"
    | "nature"
    | "architecture"
    | "general";
  query: string;
  fallbackQueries: string[];
  anchorTerms: string[];
  rejectTerms: string[];
  allowGenericAfrica: boolean;
};

const GENERIC_IMAGE_TERMS = new Set([
  "image",
  "images",
  "photo",
  "photos",
  "picture",
  "pictures",
  "pics",
  "wallpaper",
  "wallpapers",
]);

const CATEGORY_KEYWORDS: Array<{
  category: ImageSearchGrounding["category"];
  keywords: RegExp;
}> = [
  { category: "culture", keywords: /\b(culture|festival|tradition|traditional|heritage|kente|cloth|art|music|dance|people|market)\b/i },
  { category: "cities", keywords: /\b(city|cities|street|urban|market|downtown|scene|life)\b/i },
  { category: "nature", keywords: /\b(nature|wildlife|landscape|beach|forest|coast|coastline|park|savannah|safari)\b/i },
  { category: "architecture", keywords: /\b(architecture|building|buildings|castle|monument|landmark|facade|skyline|structure)\b/i },
  { category: "people", keywords: /\b(person|people|portrait|crowd|candid|street)\b/i },
  { category: "landmarks", keywords: /\b(landmark|landmarks|monument|site|castle|square|museum|bridge)\b/i },
];

const GHANA_ANCHORS = [
  "Accra",
  "Black Star Square",
  "Cape Coast Castle",
  "Kumasi",
  "Kente cloth",
  "Makola Market",
  "traditional festivals",
];

function uniqueTerms(terms: string[]): string[] {
  return Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean)));
}

function normalizeSearchPhrase(value: string): string {
  return value
    .replace(/\b(?:image|images|photo|photos|picture|pictures|pics?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(query: string, intent?: ImageSearchInput["intent"]): ImageSearchGrounding["category"] {
  if (intent === "nature") return "nature";
  if (intent === "architecture") return "architecture";
  if (intent === "person") return "people";
  if (intent === "comparison" || intent === "educational" || intent === "diagram") {
    return "architecture";
  }

  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.test(query)) {
      return entry.category;
    }
  }

  return "general";
}

function inferEntity(query: string): string {
  const cleaned = normalizeSearchPhrase(query);
  const stripped = cleaned.replace(/\b(?:of|about|in|for)\b.+$/i, "").trim();
  return stripped || cleaned;
}

function buildAnchorTerms(entity: string, category: ImageSearchGrounding["category"]): string[] {
  const lower = entity.toLowerCase();
  const anchorTerms = [entity];

  if (lower.includes("ghana")) {
    anchorTerms.push(...GHANA_ANCHORS);
  }

  switch (category) {
    case "culture":
      anchorTerms.push("traditional festivals", "cultural scene", "local market", "textiles");
      break;
    case "cities":
      anchorTerms.push("city scene", "street scene", "market", "downtown");
      break;
    case "nature":
      anchorTerms.push("landscape", "wildlife", "coastline", "national park");
      break;
    case "architecture":
      anchorTerms.push("landmark", "monument", "building", "facade");
      break;
    case "people":
      anchorTerms.push("street portrait", "candid people", "local people");
      break;
    case "landmarks":
      anchorTerms.push("landmark", "castle", "square", "museum");
      break;
    default:
      anchorTerms.push("landmarks", "culture", "city scenes");
      break;
  }

  return uniqueTerms(anchorTerms);
}

export function groundImageSearchQuery(input: ImageSearchInput): ImageSearchGrounding {
  const query = normalizeSearchPhrase(input.query || "");
  const entity = inferEntity(query);
  const category = inferCategory(query, input.intent);
  const anchorTerms = buildAnchorTerms(entity, category);
  const allowGenericAfrica = /\bafrica\b/i.test(query) || /\bafrica\b/i.test(entity);

  const queryParts = uniqueTerms([
    entity,
    category === "general" ? "" : category,
    ...anchorTerms.slice(1, 6),
  ]).filter((term) => !GENERIC_IMAGE_TERMS.has(term.toLowerCase()));

  const fallbackQueries = uniqueTerms([
    [entity, "landmarks", ...anchorTerms.slice(1, 4)].filter(Boolean).join(" "),
    [entity, "culture", ...anchorTerms.slice(1, 5)].filter(Boolean).join(" "),
    [entity, "city life", ...anchorTerms.slice(1, 5)].filter(Boolean).join(" "),
  ]);

  return {
    entity,
    category,
    query: queryParts.join(" ").trim() || query,
    fallbackQueries,
    anchorTerms,
    rejectTerms: allowGenericAfrica ? [] : ["africa", "savannah", "safari", "continent", "stock", "generic"],
    allowGenericAfrica,
  };
}

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

function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function rankImages(
  providerImages: ProviderImage[],
  input: ImageSearchInput,
): RetrievedImage[] {
  const grounding = groundImageSearchQuery(input);
  const seen = new Set<string>();
  const imgs = providerImages
    .map((p, idx) => {
      const norm = normalizeUrl(p.url);
      const searchText = [p.title, p.sourcePage, p.url, p.provider]
        .filter(Boolean)
        .join(" ");
      const baseRel = lexicalScore(grounding.query, searchText);
      const anchorHits = grounding.anchorTerms.filter((term) =>
        searchText.toLowerCase().includes(term.toLowerCase()),
      ).length;
      const anchorBonus = Math.min(0.3, anchorHits * 0.07);
      const genericPenalty = grounding.rejectTerms.some((term) =>
        searchText.toLowerCase().includes(term.toLowerCase()),
      )
        ? 0.35
        : 0;
      const fallbackRel = 1 - idx / Math.max(providerImages.length, 1);
      const rel = Math.max(baseRel, fallbackRel * 0.25);
      const resolution = (p.width || 0) * (p.height || 0) || 0;
      // aspect bonus
      let aspectBonus = 0;
      if (input.aspectRatio && p.width && p.height) {
        const aspect = p.width / p.height;
        if (input.aspectRatio === "landscape" && aspect >= 1.2) aspectBonus = 0.05;
        if (input.aspectRatio === "portrait" && aspect <= 0.8) aspectBonus = 0.05;
        if (input.aspectRatio === "square" && Math.abs(aspect - 1) < 0.2) aspectBonus = 0.06;
      }

      const score = clampScore(
        rel * 0.55 + anchorBonus + (Math.log10(Math.max(1, resolution)) / 10) * 0.2 + aspectBonus - genericPenalty,
      );

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
        source: p.sourcePage || p.provider,
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

export function filterRelevantImages(
  images: RetrievedImage[],
  input: ImageSearchInput,
): RetrievedImage[] {
  const grounding = groundImageSearchQuery(input);
  const minimumScore = input.intent === "person" ? 0.62 : 0.7;

  return images.filter((image) => {
    const text = [image.title, image.sourcePage, image.source, image.url, image.provider]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const score = image.relevanceScore ?? lexicalScore(grounding.query, text);
    if (score < minimumScore) {
      return false;
    }

    if (
      !grounding.allowGenericAfrica &&
      /\b(africa|savannah|safari|continent|stock photo|generic)\b/.test(text) &&
      !/\bghana\b/.test(text)
    ) {
      return false;
    }

    return true;
  });
}

export function computeSemanticConfidence(
  images: RetrievedImage[],
  input: ImageSearchInput,
): number {
  if (images.length === 0) {
    return 0;
  }

  const grounding = groundImageSearchQuery(input);
  const topScores = images
    .map((image) => {
      const text = [image.title, image.sourcePage, image.source, image.url, image.provider]
        .filter(Boolean)
        .join(" ");
      return image.relevanceScore ?? lexicalScore(grounding.query, text);
    })
    .sort((a, b) => b - a)
    .slice(0, Math.min(3, images.length));

  return clampScore(topScores.reduce((sum, score) => sum + score, 0) / topScores.length);
}
