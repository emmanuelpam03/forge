export const GLOBAL_MODEL_KEY = "forge:global:selected-model";

export function getGlobalDefaultModel(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(GLOBAL_MODEL_KEY);
  } catch {
    return null;
  }
}

export function setGlobalDefaultModel(id: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (id === null) window.localStorage.removeItem(GLOBAL_MODEL_KEY);
    else window.localStorage.setItem(GLOBAL_MODEL_KEY, id);
  } catch {
    // ignore
  }
}

export default function useGlobalSettings() {
  // small convenience hook if needed later
  return { getGlobalDefaultModel, setGlobalDefaultModel };
}
