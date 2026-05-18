export type ImageSearchInput = {
  query: string;
  intent?:
    | "educational"
    | "comparison"
    | "travel"
    | "product"
    | "historical"
    | "person"
    | "nature"
    | "food"
    | "architecture"
    | "ui_reference"
    | "diagram"
    | "inspiration";
  count?: number;
  aspectRatio?: "square" | "landscape" | "portrait";
  safeSearch?: boolean;
  conversationContext?: string;
  preferredSource?: string[];
  placementHint?: "inline" | "gallery" | "hero";
  freshness?: "latest" | "recent" | "any";
  avoidDuplicates?: boolean;
};

export type RetrievedImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  title?: string;
  sourcePage?: string;
  width?: number;
  height?: number;
  provider?: string;
  relevanceScore?: number;
  safetyScore?: number;
  metadata?: {
    author?: string;
    license?: string;
    publishedAt?: string;
  };
};

export type ImageSearchResult = {
  success: boolean;
  images: RetrievedImage[];
  queryUsed: string;
  totalFound: number;
  retrievalTimeMs: number;
};

export type ProviderImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  title?: string;
  sourcePage?: string;
  width?: number;
  height?: number;
  provider?: string;
};
