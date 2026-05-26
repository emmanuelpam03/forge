import "server-only";

import fetchWithTimeout from "./fetchWithTimeout.ts";

export type UnstructuredExtractionInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type UnstructuredExtractionOutput = {
  text: string;
  pageCount?: number;
};

type UnstructuredElement = {
  text?: unknown;
  page_content?: unknown;
  metadata?: {
    page_number?: unknown;
  };
};

function resolveUnstructuredEndpoint(): string {
  const explicit = process.env.UNSTRUCTURED_API_ENDPOINT?.trim();
  if (explicit) {
    return explicit;
  }

  const baseUrl =
    process.env.UNSTRUCTURED_API_URL?.trim() || "https://unstructuredapp.io";
  return `${baseUrl.replace(/\/$/, "")}/general/v0/general`;
}

function resolveUnstructuredApiKey(): string {
  const apiKey = process.env.UNSTRUCTURED_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("UNSTRUCTURED_API_KEY is not configured.");
  }

  return apiKey;
}

function normalizeElementText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseUnstructuredPayload(payload: unknown): UnstructuredExtractionOutput {
  const items: UnstructuredElement[] = Array.isArray(payload)
    ? (payload as UnstructuredElement[])
    : Array.isArray((payload as { elements?: unknown[] })?.elements)
      ? (((payload as { elements?: unknown[] }).elements ?? []) as UnstructuredElement[])
      : [];

  if (items.length === 0) {
    const direct =
      normalizeElementText((payload as { text?: unknown })?.text) ||
      normalizeElementText((payload as { page_content?: unknown })?.page_content);

    return {
      text: direct,
      pageCount: undefined,
    };
  }

  const pageNumbers = new Set<number>();
  const chunks: string[] = [];

  for (const item of items) {
    const text = normalizeElementText(item.text) || normalizeElementText(item.page_content);
    if (text) {
      chunks.push(text);
    }

    const rawPageNumber = item.metadata?.page_number;
    if (typeof rawPageNumber === "number" && Number.isFinite(rawPageNumber) && rawPageNumber > 0) {
      pageNumbers.add(rawPageNumber);
    }
  }

  return {
    text: chunks.join("\n\n").trim(),
    pageCount: pageNumbers.size > 0 ? pageNumbers.size : undefined,
  };
}

export async function extractTextWithUnstructured(
  input: UnstructuredExtractionInput,
): Promise<UnstructuredExtractionOutput> {
  const endpoint = resolveUnstructuredEndpoint();
  const apiKey = resolveUnstructuredApiKey();

  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.buffer)], {
    type: input.mimeType || "application/octet-stream",
  });
  form.append("files", blob, input.fileName);

  const strategy = process.env.UNSTRUCTURED_PARTITION_STRATEGY?.trim();
  if (strategy) {
    form.append("strategy", strategy);
  }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: form,
    },
    Number.parseInt(process.env.UNSTRUCTURED_TIMEOUT_MS ?? "30000", 10) || 30000,
  );

  if (!response.ok) {
    const responseText = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(
      `Unstructured extraction failed (${response.status} ${response.statusText})${
        responseText ? `: ${responseText}` : ""
      }`,
    );
  }

  const payload = await response.json().catch(() => null);
  return parseUnstructuredPayload(payload);
}
