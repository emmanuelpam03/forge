import { NextResponse } from "next/server";
import { authHandler } from "@/lib/auth";

async function delegate(request: Request) {
  try {
    return await authHandler(request);
  } catch (err) {
    // Fallback JSON error for visibility during wiring
    // eslint-disable-next-line no-console
    console.error("Better Auth handler error:", err);
    return NextResponse.json({ error: "auth handler error" }, { status: 500 });
  }
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
