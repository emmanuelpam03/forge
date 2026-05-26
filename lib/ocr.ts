import "server-only";

import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);

// Lightweight ESM-safe OCR adapter for tesseract.js v7.
// - Document OCR (PDF scans) is on by default
// - Image OCR is opt-in via ENABLE_IMAGE_OCR=1

export type OcrScope = "image" | "document";

type TesseractModule = {
  recognize?: (
    image: Buffer,
    langs?: string,
    options?: { workerPath?: string; langPath?: string; corePath?: string },
  ) => Promise<{ data?: { text?: string } }>;
  createWorker?: (
    langs?: string,
    oem?: number,
    options?: { workerPath?: string; langPath?: string; corePath?: string },
  ) => Promise<{
    recognize: (image: Buffer) => Promise<{ data?: { text?: string } }>;
    terminate: () => Promise<unknown>;
  }>;
};

export async function isDocumentOcrEnabled(): Promise<boolean> {
  if (process.env.DISABLE_DOCUMENT_OCR === "1") return false;
  return true;
}

export async function isOcrEnabled(): Promise<boolean> {
  if (process.env.DISABLE_IMAGE_OCR === "1") return false;
  if (process.env.ENABLE_IMAGE_OCR === "1") return true;
  return false;
}

async function isScopeEnabled(scope: OcrScope): Promise<boolean> {
  return scope === "document" ? isDocumentOcrEnabled() : isOcrEnabled();
}

function resolveWorkerOptions(workerPath?: string): { workerPath?: string } {
  if (workerPath?.trim() && existsSync(workerPath.trim())) {
    return { workerPath: workerPath.trim() };
  }

  // Prefer tesseract.js built-in worker (has correct dependency resolution).
  try {
    const pkgPath = require.resolve("tesseract.js/package.json");
    const builtinWorker = join(
      dirname(pkgPath),
      "src",
      "worker-script",
      "node",
      "index.js",
    );
    if (existsSync(builtinWorker)) {
      return { workerPath: builtinWorker };
    }
  } catch {
    // fall through to copied worker
  }

  const copiedWorker = resolve(
    process.cwd(),
    "tesseract-worker",
    "node",
    "index.js",
  );
  if (existsSync(copiedWorker)) {
    return { workerPath: copiedWorker };
  }

  return {};
}

async function loadTesseract(): Promise<TesseractModule | null> {
  try {
    const imported: unknown = await import("tesseract.js");
    if (imported && typeof imported === "object") {
      return imported as TesseractModule;
    }
    return null;
  } catch {
    return null;
  }
}

export async function isAvailable(scope: OcrScope = "image"): Promise<boolean> {
  if (!(await isScopeEnabled(scope))) return false;

  const tesseract = await loadTesseract();
  return (
    typeof tesseract?.recognize === "function" ||
    typeof tesseract?.createWorker === "function"
  );
}

export async function extractText(
  buffer: Buffer,
  opts?: { lang?: string; workerPath?: string; scope?: OcrScope },
): Promise<string> {
  const scope = opts?.scope ?? "image";
  if (!(await isScopeEnabled(scope))) return "";

  const tesseract = await loadTesseract();
  if (!tesseract) return "";

  const lang = opts?.lang ?? "eng";

  try {
    if (typeof tesseract.recognize === "function") {
      // Let tesseract.js pick its default node worker + dependency resolution.
      const result = await tesseract.recognize(buffer, lang);
      return (result.data?.text ?? "").trim();
    }

    if (typeof tesseract.createWorker === "function") {
      const worker = await tesseract.createWorker(lang);
      try {
        const result = await worker.recognize(buffer);
        return (result.data?.text ?? "").trim();
      } finally {
        await worker.terminate();
      }
    }

    return "";
  } catch (err) {
    try {
      console.warn(
        `OCR extractText failed (scope=${scope}, lang=${lang}):`,
        (err as Error)?.message ?? String(err),
      );
    } catch {}
    return "";
  }
}

export default {
  isAvailable,
  extractText,
  isOcrEnabled,
  isDocumentOcrEnabled,
};
