import { NextResponse } from "next/server";
import { requireServerUser } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireServerUser(request);
  try {
    await prisma.session.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to sign out everywhere" }, { status: 500 });
  }
}
