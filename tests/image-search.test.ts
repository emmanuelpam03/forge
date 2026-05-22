import assert from "node:assert/strict";
import test from "node:test";

import {
  filterRelevantImages,
  groundImageSearchQuery,
} from "../ai/services/image-ranking.ts";
import type { RetrievedImage } from "../ai/tools/image-types.ts";

test("groundImageSearchQuery expands vague country image requests", () => {
  const grounded = groundImageSearchQuery({ query: "Ghana images" });

  assert.match(grounded.query, /Ghana/);
  assert.match(grounded.query, /Accra|Cape Coast Castle|Kente/);
  assert.equal(grounded.allowGenericAfrica, false);
  assert.ok(grounded.fallbackQueries.length >= 2);
});

test("filterRelevantImages drops generic Africa stock imagery for Ghana queries", () => {
  const images: RetrievedImage[] = [
    {
      id: "1",
      url: "https://example.com/ghana-castle.jpg",
      thumbnailUrl: "https://example.com/ghana-castle-thumb.jpg",
      title: "Cape Coast Castle in Ghana",
      sourcePage: "https://example.com/ghana-castle",
      relevanceScore: 0.9,
    },
    {
      id: "2",
      url: "https://example.com/generic-africa.jpg",
      thumbnailUrl: "https://example.com/generic-africa-thumb.jpg",
      title: "Africa landscape stock photo",
      sourcePage: "https://example.com/africa-stock",
      relevanceScore: 0.95,
    },
  ];

  const filtered = filterRelevantImages(images, { query: "Ghana images" });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "1");
});