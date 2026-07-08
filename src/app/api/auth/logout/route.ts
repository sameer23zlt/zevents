import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Clears the HTTP-only session cookie.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return response;
}
