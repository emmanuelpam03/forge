import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { error as logError } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;

  let chat: { id: string; title: string } | null = null;

  try {
    chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, title: true },
    });
  } catch (error) {
    logError("chat_lookup_failed", { chatId, error });
    return NextResponse.json(
      { error: "Failed to load chat" },
      { status: 500 },
    );
  }

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({ chatId: chat.id, title: chat.title });
}