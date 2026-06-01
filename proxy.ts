import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedMatchers = ["/p", "/search", "/metrics", "/settings"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const isProtected = protectedMatchers.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/p/:path*",
    "/c/:path*",
    "/search/:path*",
    "/metrics/:path*",
    "/settings/:path*",
  ],
};
