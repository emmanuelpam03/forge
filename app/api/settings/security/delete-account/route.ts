import { NextResponse } from "next/server";
import { requireServerUser } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireServerUser(request);
  try {
    // cascade deletes related records via Prisma onDelete cascade
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
