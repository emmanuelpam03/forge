import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function delegate(request: Request) {
  const handler = (auth as any).handle || (auth as any).handleRequest || (auth as any).requestHandler;
  if (typeof handler === "function") {
    try {
      return await handler(request);
    } catch (err) {
      // Fallback JSON error for visibility during wiring
      // eslint-disable-next-line no-console
      console.error("Better Auth handler error:", err);
      return NextResponse.json({ error: "auth handler error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Auth handler not implemented on server" }, { status: 501 });
}

export async function GET(request: Request) {
  return delegate(request);
}

export async function POST(request: Request) {
  return delegate(request);
}

export async function PUT(request: Request) {
  return delegate(request);
}

export async function DELETE(request: Request) {
  return delegate(request);
}

export async function PATCH(request: Request) {
  return delegate(request);
}

export async function OPTIONS(request: Request) {
  return delegate(request);
}
