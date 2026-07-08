import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Returns the current session (if any) so the client can decide what to render.
 */
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json(
    { user: { sub: session.sub, role: session.role, username: session.username } },
    { status: 200 }
  );
}
