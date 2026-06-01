import { NextResponse } from "next/server";
import { requireServerUser } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireServerUser(request);
  try {
    const body = await request.json();
    const email = body?.email?.trim?.();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // ensure email not used by another account
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { email } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}
