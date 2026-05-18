"use client";
import React from "react";

type Img = { id: string; url: string; thumbnailUrl?: string; title?: string };

export default function ImageCarousel({ images }: { images: Img[] }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="my-4">
      <div className="flex space-x-3 overflow-x-auto py-2">
        {images.map((im) => (
          <div key={im.id} className="flex-none w-56 h-36 rounded-md overflow-hidden bg-gray-100">
            <img src={im.thumbnailUrl || im.url} alt={im.title || "image"} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
