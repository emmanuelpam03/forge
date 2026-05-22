"use client";

export function getGlobalDefaultModel(): string | null {
  try {
    return localStorage.getItem("forge:global:selected-model");
  } catch {
    return null;
  }
}

export function setGlobalDefaultModel(modelId: string): void {
  try {
    localStorage.setItem("forge:global:selected-model", modelId);
  } catch {
    // ignore
  }
}

export default function useGlobalSettings() {
  return {
    getGlobalDefaultModel,
    setGlobalDefaultModel,
  } as const;
}
