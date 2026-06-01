import { NextResponse } from "next/server";
import { getServerSessionFromRequest } from "./lib/server-auth";

const protectedMatchers = [
  "/p",
  "/c",
  "/settings",
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
    // Redirect to the public login path. Internal grouping folders like "(auth)"
    // are not valid public URLs and will produce 404s (use "/login").
    const redirectUrl = new URL("/login", url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/p/:path*",
    "/c/:path*",
    "/settings/:path*",
    "/search/:path*",
    "/metrics/:path*",
  ],
};
