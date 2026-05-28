#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// Simple script to create generated-images.json for the Next.js component.
// If you configure and expose the project's imageGeneration tool via import,
// you can replace the placeholder flow below with a real provider call.

type GeneratedImage = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

const outPath = path.join(process.cwd(), 'generated-images.json');

async function main() {
  const useRealGeneration = process.env.FORGE_GENERATE === '1';

  const prompts = [
    {
      id: 'a',
      alt: 'Students collaborating on STEM project',
      prompt:
        'Photorealistic photo of a diverse group of middle-school students collaborating on a STEM project around a table with a robotics kit, teacher nearby, bright classroom, natural window light, candid composition, non-identifiable faces, 16:9, high resolution',
    },
    {
      id: 'b',
      alt: 'Students in STEM lab with laptops',
      prompt:
        'Photorealistic photo of students in a classroom STEM lab working on laptops and circuit boards, collaborative atmosphere, warm tones, soft depth of field, non-identifiable faces, 16:9, high resolution',
    },
    {
      id: 'c',
      alt: 'Students raising hands in class',
      prompt:
        'Photorealistic photo of an engaged mixed-age classroom with several students raising hands during a lesson, teacher at front, bright modern classroom, non-identifiable faces, 16:9, high resolution',
    },
  ];

  const images: GeneratedImage[] = [];

  if (useRealGeneration) {
    try {
      // Try to import the project's tool implementation (best-effort).
      // Replace with your actual image generation call if available.
      // Example (pseudo):
      // const { pollinationsImageGenerationToolAsync } = await import('../ai/tools/implementations');
      // const result = await pollinationsImageGenerationToolAsync({ prompt: prompts[0].prompt, aspectRatio: '16:9' });

      // For safety, this script currently falls back to placeholders. If you
      // want to wire in the real provider, edit this block.
      console.log('FORGE_GENERATE=1 detected but no provider wired; falling back to placeholders.');
    } catch (err) {
      console.warn('Attempt to use provider failed; falling back to placeholders.', err);
    }
  }

  // Placeholder images (you should replace them with real generated URLs)
  images.push(
    {
      id: 'a',
      src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600',
      alt: prompts[0].alt,
      width: 1600,
      height: 900,
    },
    {
      id: 'b',
      src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600',
      alt: prompts[1].alt,
      width: 1600,
      height: 900,
    },
    {
      id: 'c',
      src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600',
      alt: prompts[2].alt,
      width: 1600,
      height: 900,
    },
  );

  await writeFile(outPath, JSON.stringify(images, null, 2), 'utf8');
  console.log(`Wrote ${images.length} images to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
