import { getRedisClient } from "@/lib/redis";
import { CHAT_TITLE_UPDATES_CHANNEL } from "@/lib/chat-title-events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const redis = getRedisClient();
  if (!redis) {
    return new Response("Redis unavailable", { status: 503 });
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
          send(JSON.parse(message));
        } catch {
          send({ chatId: "", title: "" });
        }
      }).catch(() => {
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