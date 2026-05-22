import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: (request as any).headers });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  return NextResponse.json({ authenticated: true, userId: session.user.id });
}
