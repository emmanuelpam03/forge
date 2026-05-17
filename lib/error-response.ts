import { error as logError } from "./logger.ts";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toResponse(error: unknown) {
  if (error instanceof ApiError) {
    const payload = { error: error.message, code: error.code };
    return new Response(JSON.stringify(payload), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Unknown errors -> 500
  try {
    logError("unhandled_error", { error });
  } catch {}

  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
