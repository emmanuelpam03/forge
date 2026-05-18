"use client";
import Image from "next/image";

type Img = { id: string; url: string; thumbnailUrl?: string; title?: string };

export default function ImageGrid({ images }: { images: Img[] }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="my-4 grid grid-cols-2 md:grid-cols-3 gap-3">
      {images.map((im) => (
        <div key={im.id} className="rounded-md overflow-hidden bg-gray-100">
          <Image src={im.thumbnailUrl || im.url} alt={im.title || "image"} className="w-full h-40 object-cover" />
        </div>
      ))}
    </div>
  );
}
