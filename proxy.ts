import { NextResponse } from "next/server";
import { getServerSessionFromRequest } from "./lib/server-auth";

const protectedMatchers = [
  "/p",
  "/c",
  "/search",
  "/metrics",
];

export async function proxy(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Allow static assets and auth routes to flow
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  const isProtected = protectedMatchers.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const session = await getServerSessionFromRequest(req as unknown as Request);
  if (!session?.user) {
    const redirectUrl = new URL("/(auth)/login", url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/p/:path*",
    "/c/:path*",
    "/search/:path*",
    "/metrics/:path*",
  ],
};
