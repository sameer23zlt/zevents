/**
 * Authentication middleware helpers for Zevents API routes.
 *
 * Usage in a route handler:
 *   const authError = await requireAdmin(request);
 *   if (authError) return authError;
 *
 * Returns:
 *   - null        — auth check passed; proceed with the request
 *   - NextResponse — 401 when token is missing/expired, 403 when role is insufficient
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

/**
 * Guard that allows only requests with a valid session where role === "admin".
 *
 * @param request  The incoming `NextRequest`.
 * @returns        `null` on success, or a `NextResponse` with 401/403 on failure.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    // Token is missing or expired
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    // Token is valid but the role is insufficient
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// requireUser
// ---------------------------------------------------------------------------

/**
 * Guard that allows requests with any valid session (role "admin" or "user").
 *
 * @param request  The incoming `NextRequest`.
 * @returns        `null` on success, or a `NextResponse` with 401/403 on failure.
 */
export async function requireUser(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    // Token is missing or expired
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "user") {
    // Token is valid but the role is not recognised
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return null;
}
