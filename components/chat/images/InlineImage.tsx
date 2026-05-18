"use client";
import React from "react";

type Props = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
};

export default function InlineImage({ src, alt, width, height, caption }: Props) {
  return (
    <figure className="my-4">
      <img src={src} alt={alt || "image"} className="w-full h-auto rounded-md object-cover" style={{ width: width ? width : undefined, height: height ? height : undefined }} />
      {caption ? <figcaption className="text-sm text-muted mt-2">{caption}</figcaption> : null}
    </figure>
  );
}
