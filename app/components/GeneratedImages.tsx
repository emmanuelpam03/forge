"use client";

import Image from "next/image";
import images from "../../generated-images.json";

type Img = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

export default function GeneratedImages() {
  const imgs: Img[] = images as Img[];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {imgs.map((img) => (
        <div key={img.id} className="rounded overflow-hidden">
          <Image
            src={img.src}
            alt={img.alt}
            width={img.width}
            height={img.height}
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
            priority
          />
        </div>
      ))}
    </div>
  );
}
