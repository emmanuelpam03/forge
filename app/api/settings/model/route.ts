import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: (request as any).headers });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const key = `user:${session.user.id}:default_model`;
    const pref = await prisma.preference.findUnique({ where: { key } });
    return NextResponse.json({ modelId: pref?.value ?? null });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: (request as any).headers });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const modelId = typeof body?.modelId === "string" ? body.modelId : null;
    if (!modelId) {
      return new Response(JSON.stringify({ error: "modelId required" }), { status: 400 });
    }

    const key = `user:${session.user.id}:default_model`;
    const existing = await prisma.preference.findUnique({ where: { key } });
    if (existing) {
      await prisma.preference.update({ where: { key }, data: { value: modelId } });
    } else {
      await prisma.preference.create({ data: { key, value: modelId, category: "user" } });
    }

    return NextResponse.json({ success: true, modelId });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
