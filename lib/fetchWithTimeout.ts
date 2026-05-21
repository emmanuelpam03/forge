export async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  const defaultTimeout = Number(process.env.FETCH_TIMEOUT_MS ?? 6000);
  const t = typeof timeoutMs === "number" ? timeoutMs : defaultTimeout;

  const controller = new AbortController();
  const originalSignal = init?.signal;

  // If an external signal exists, forward its abort to our controller
  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      try {
        originalSignal.addEventListener("abort", onAbort);
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
  }
}

export default fetchWithTimeout;
