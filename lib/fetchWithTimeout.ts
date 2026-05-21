export async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  const rawEnv = process.env.FETCH_TIMEOUT_MS;
  let defaultTimeout = 6000;
  if (rawEnv !== undefined) {
    const parsed = parseInt(rawEnv, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      // Clamp to a sensible maximum (60s)
      defaultTimeout = Math.min(parsed, 60_000);
    } else {
      // Informative warning to help debugging invalid env values
      console.warn(
        `Invalid FETCH_TIMEOUT_MS='${rawEnv}' — falling back to ${defaultTimeout}ms`,
      );
    }
  }

  const t = typeof timeoutMs === "number" ? timeoutMs : defaultTimeout;

  const controller = new AbortController();
  const originalSignal = init?.signal;
  // If an external signal exists, forward its abort to our controller
  let listenerAdded = false;
  const onAbort = () => controller.abort();
  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort();
    } else {
      try {
        originalSignal.addEventListener("abort", onAbort);
        listenerAdded = true;
      } catch {
        // some signal implementations may not support addEventListener
      }
    }
  }

  const finalInit = { ...(init ?? {}), signal: controller.signal } as RequestInit;

  const timer = setTimeout(() => controller.abort(), t);

  try {
    const res = await fetch(input, finalInit);
    return res;
  } finally {
    clearTimeout(timer);
    // Clean up forwarded abort listener to avoid leaking listeners
    try {
      if (originalSignal && listenerAdded && typeof (originalSignal as EventTarget).removeEventListener === "function") {
        (originalSignal as EventTarget).removeEventListener("abort", onAbort);
      }
    } catch {
      // ignore cleanup errors
    }
  }
}

export default fetchWithTimeout;
