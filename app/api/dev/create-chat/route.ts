import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message ?? "Hello from test";

    const chat = await prisma.chat.create({
      data: { title: message.slice(0, 80) || "Test Chat" },
    });

    const userMessage = await prisma.message.create({
      data: { chatId: chat.id, role: "user", content: message },
    });

    return new Response(
      JSON.stringify({ chatId: chat.id, messageId: userMessage.id }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "failed" }), { status: 500 });
  }
}
