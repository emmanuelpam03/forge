import { randomUUID } from "node:crypto";

import fetchWithTimeout from "@/lib/fetchWithTimeout";
import { uploadAttachmentToCloudinary } from "@/lib/cloudinary";
import type { ProviderImage } from "../image-types";

type PollinationsImageGenerationInput = {
  prompt: string;
  aspectRatio?: "square" | "landscape" | "portrait";
  style?: string;
};

type PollinationsGeneratedImageResult = {
  provider: "pollinations";
  promptUsed: string;
  retrievalTimeMs: number;
  images: ProviderImage[];
};

function getPollinationsDimensions(
  aspectRatio?: PollinationsImageGenerationInput["aspectRatio"],
): { width: number; height: number } {
  switch (aspectRatio) {
    case "portrait":
      return { width: 512, height: 768 };
    case "landscape":
      return { width: 768, height: 512 };
    case "square":
    default:
      return { width: 768, height: 768 };
  }
}

function buildAspectPrompt(
  prompt: string,
  aspectRatio?: PollinationsImageGenerationInput["aspectRatio"],
  style?: string,
): string {
  const trimmedPrompt = prompt.trim();
  const aspectPrefix =
    aspectRatio === "landscape"
      ? "Wide landscape image of"
      : aspectRatio === "portrait"
        ? "Tall portrait image of"
        : "Square image of";
  const styleSuffix = style?.trim() ? ` in a ${style.trim()} style` : "";

  return `${aspectPrefix} ${trimmedPrompt}${styleSuffix}`.trim();
}

function guessImageMimeType(contentType: string | null): string {
  const normalized = (contentType ?? "").toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) {
    return "image/jpeg";
  }
  if (normalized.includes("webp")) {
    return "image/webp";
  }
  if (normalized.includes("png")) {
    return "image/png";
  }
  return "image/png";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

export async function pollinationsGenerateImage(
  input: PollinationsImageGenerationInput,
  chatId: string,
): Promise<PollinationsGeneratedImageResult> {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("POLLINATIONS_API_KEY is required for image generation.");
  }

  const promptUsed = buildAspectPrompt(input.prompt, input.aspectRatio, input.style);
  const { width, height } = getPollinationsDimensions(input.aspectRatio);
  const imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(promptUsed)}?model=flux&width=${width}&height=${height}`;

  const startedAt = Date.now();
  const response = await fetchWithTimeout(imageUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Pollinations image generation failed with status ${response.status}.`);
  }

  const mimeType = guessImageMimeType(response.headers.get("content-type"));
  const buffer = Buffer.from(await response.arrayBuffer());
  const uploadId = randomUUID();
  const uploadResult = await uploadAttachmentToCloudinary({
    chatId,
    attachmentId: uploadId,
    buffer,
    fileName: `pollinations-${uploadId}${extensionForMimeType(mimeType)}`,
    mimeType,
  });

  const generatedImage: ProviderImage = {
    id: uploadId,
    url: uploadResult.secure_url,
    thumbnailUrl: uploadResult.secure_url,
    title: input.prompt.trim(),
    provider: "pollinations",
  };

  return {
    provider: "pollinations",
    promptUsed,
    retrievalTimeMs: Date.now() - startedAt,
    images: [generatedImage],
  };
}