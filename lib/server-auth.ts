import { headers } from "next/headers";
import { auth, type Session } from "@/lib/auth";

export async function getServerSession(): Promise<Session | null> {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (err) {
    console.warn("getServerSession failed", err);
    return null;
  }
}

export async function getServerSessionFromRequest(
  request?: Request,
): Promise<Session | null> {
  if (request) {
    try {
      return await auth.api.getSession({
        headers: request.headers,
      });
    } catch (err) {
      console.warn("getServerSessionFromRequest failed", err);
      return null;
    }
  }
  return getServerSession();
}

export async function requireServerUser(request?: Request) {
  const session = await getServerSessionFromRequest(request);
  const user = session?.user ?? null;
  if (!user) {
    const err = new Error("Unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return user;
}
