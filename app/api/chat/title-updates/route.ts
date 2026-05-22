import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRedisClient } from "@/lib/redis";
import { CHAT_TITLE_UPDATES_CHANNEL } from "@/lib/chat-title-events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const redis = getRedisClient();
  if (!redis) {
    return new Response("Redis unavailable", { status: 503 });
  }

  // Parse optional chatIds query param to limit which chat updates are forwarded
  const url = new URL(request.url);
  const chatIdsParam = url.searchParams.get("chatIds") ?? "";
  const requestedChatIds = Array.from(
    chatIdsParam
      .split(",")
      .map((s) => decodeURIComponent(s || "").trim())
      .filter(Boolean),
  );

  const allowedChatIds = new Set(requestedChatIds);

  if (requestedChatIds.length > 0) {
    const existingChats = await prisma.chat.findMany({
      where: { id: { in: requestedChatIds } },
      select: { id: true },
    });

    const existingChatIds = new Set(existingChats.map((chat) => chat.id));
    const missingChatIds = requestedChatIds.filter((chatId) => !existingChatIds.has(chatId));

    if (missingChatIds.length > 0) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const subscriber = redis.duplicate();

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const close = async (controller?: ReadableStreamDefaultController) => {
    if (closed) {
      return;
    }

    closed = true;

    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    try {
      await subscriber.unsubscribe(CHAT_TITLE_UPDATES_CHANNEL);
    } catch {}

    try {
      await subscriber.quit();
    } catch {}

    if (controller) {
      try {
        controller.close();
      } catch {}
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // Ignore closed stream writes.
        }
      };

      void subscriber.subscribe(CHAT_TITLE_UPDATES_CHANNEL, (message) => {
        try {
          const msgStr = String(message);
          const parsed = JSON.parse(msgStr) as { chatId?: string; title?: string };

          // If the client requested a specific set of chatIds, only forward matching events
          if (allowedChatIds.size > 0 && parsed.chatId && !allowedChatIds.has(parsed.chatId)) {
            return; // skip non-matching chat updates
          }

          send(parsed);
        } catch {
          // Preserve original fallback behavior for malformed payloads
          // Only forward the fallback if the client is not filtering by chatIds
          if (allowedChatIds.size === 0) {
            send({ chatId: "", title: "" });
          }
        }
      }).catch((err) => {
        // Log the subscription error with channel context, then close the stream
        try {
          console.error("Failed to subscribe to chat title updates", {
            channel: CHAT_TITLE_UPDATES_CHANNEL,
            error: err,
          });
        } catch {
          // ignore logging failures
        }
        void close(controller);
      });

      heartbeat = setInterval(() => {
        send({ type: "ping", timestamp: Date.now() });
      }, 25_000);

      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      void close();
    },
  });

  request.signal.addEventListener("abort", () => {
    void close();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}