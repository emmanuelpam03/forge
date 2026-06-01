import { auth } from "@/lib/auth";

export async function getServerSessionFromRequest(request: Request | undefined) {
  const getter = (auth as any).getServerSession || (auth as any).getSession;
  if (typeof getter === "function") {
    try {
      if (request) return await getter(request);
      // Some Better Auth versions accept no-arg server call
      return await getter();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("getServerSessionFromRequest failed", err);
      return null;
    }
  }
  return null;
}

export async function requireServerUser(request?: Request) {
  const session = await getServerSessionFromRequest(request);
  const user = session?.user ?? null;
  if (!user) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return user;
}
