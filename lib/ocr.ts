import "server-only";

// Lightweight ESM-safe OCR adapter.
// - Lazy-loads tesseract.js only when needed
// - Exposes isAvailable() and extractText(buffer)
// - Respects DISABLE_IMAGE_OCR=1 to short-circuit

export async function isOcrEnabled(): Promise<boolean> {
  if (process.env.DISABLE_IMAGE_OCR === "1") return false;
  // Use explicit opt-in via ENABLE_IMAGE_OCR to avoid running OCR by default
  if (process.env.ENABLE_IMAGE_OCR === "1") return true;
  return false;
}

export async function isAvailable(): Promise<boolean> {
  if (!(await isOcrEnabled())) return false;

  try {
    const tesseractModule: unknown = await import("tesseract.js");
    const hasCreateWorker =
      typeof (tesseractModule as any)?.createWorker === "function" ||
      typeof (tesseractModule as any)?.default?.createWorker === "function";
    return Boolean(hasCreateWorker);
  } catch {
    return false;
  }
}

export async function extractText(buffer: Buffer, opts?: { lang?: string; workerPath?: string }): Promise<string> {
  if (!(await isOcrEnabled())) return "";

  try {
    const tesseractModule: unknown = await import("tesseract.js");
    const tMod = tesseractModule as { createWorker?: unknown; default?: { createWorker?: unknown } };
    const createWorker = (typeof tMod.createWorker === "function"
      ? tMod.createWorker
      : typeof tMod.default?.createWorker === "function"
      ? tMod.default!.createWorker
      : undefined) as unknown as ((opts?: unknown) => Promise<unknown>) | undefined;

    if (typeof createWorker !== "function") return "";

    // If a workerPath wasn't provided, prefer a repo-local copied worker
    // (scripts/copy-tesseract-worker.mjs) to avoid relying on pnpm virtual
    // store internal paths which can be fragile in some environments.
    let workerOptions: unknown | undefined = undefined;
    try {
      if (opts?.workerPath) {
        workerOptions = { workerPath: opts.workerPath };
      } else {
        const pathMod = await import("node:path");
        const fs = await import("node:fs");
        const fallback = pathMod.resolve(process.cwd(), "tesseract-worker", "node", "index.js");
        if (fs.existsSync(fallback)) {
          workerOptions = { workerPath: fallback };
        }
      }
    } catch {
      // ignore
    }

    const worker = await createWorker(workerOptions);

    try {
      const w = worker as unknown as Record<string, unknown>;
      if (typeof w.recognize === "function") {
        const result = await (w.recognize as (input: Buffer) => Promise<unknown>)(buffer);
        const data = (result as any)?.data;
        return (typeof data?.text === "string" ? data.text : "").trim();
      }

      if (typeof w.load === "function") {
        await (w.load as () => Promise<void>)();
        if (typeof w.loadLanguage === "function") await (w.loadLanguage as (lang: string) => Promise<void>)(opts?.lang ?? "eng");
        if (typeof w.initialize === "function") await (w.initialize as (lang: string) => Promise<void>)(opts?.lang ?? "eng");
        const result = await (w.recognize as (input: Buffer) => Promise<unknown>)(buffer);
        const data = (result as any)?.data;
        return (typeof data?.text === "string" ? data.text : "").trim();
      }

      return "";
    } finally {
      try {
        if (typeof (worker as any).terminate === "function") await (worker as any).terminate();
      } catch {}
    }
  } catch (err) {
    try {
      console.warn("OCR extractText failed:", (err as Error)?.message ?? String(err));
    } catch {}
    return "";
  }
}

export default { isAvailable, extractText, isOcrEnabled };
