/**
 * JWT authentication utilities for Zevents.
 *
 * Uses `jose` (v5) for signing and verifying JWTs stored in HTTP-only cookies.
 *
 * - signToken    — create a signed JWT with sub, role, username; 7-day expiry
 * - verifyToken  — verify a JWT string and return the decoded SessionPayload
 * - getSessionFromRequest — extract and verify the JWT from the `session` cookie
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import type { SessionPayload } from "@/types/models";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encode the JWT_SECRET env var as a Uint8Array for `jose`.
 * Throws at call-time if the variable is absent so failures surface early.
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing environment variable: JWT_SECRET. " +
        "Add it to your .env.local file."
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// signToken
// ---------------------------------------------------------------------------

/**
 * Sign a new JWT containing the given session fields.
 *
 * @param payload  The fields to embed in the token.
 * @returns        A signed JWT string.
 */
export async function signToken(
  payload: Pick<SessionPayload, "sub" | "role" | "username">
): Promise<string> {
  const secret = getSecret();

  return new SignJWT({
    sub: payload.sub,
    role: payload.role,
    username: payload.username,
  } as JWTPayload & Pick<SessionPayload, "role" | "username">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------

/**
 * Verify a JWT string and return the decoded payload.
 *
 * @param token  A signed JWT string.
 * @returns      The decoded `SessionPayload`, or `null` if verification fails
 *               (expired, malformed, wrong signature, etc.).
 */
export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    // Validate that all required fields are present before casting
    if (
      typeof payload.sub !== "string" ||
      typeof (payload as Record<string, unknown>).role !== "string" ||
      typeof (payload as Record<string, unknown>).username !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return payload as unknown as SessionPayload;
  } catch {
    // Token is expired, malformed, or signature is invalid
    return null;
  }
}

// ---------------------------------------------------------------------------
// getSessionFromRequest
// ---------------------------------------------------------------------------

/**
 * Extract and verify the JWT from the HTTP-only `session` cookie attached to
 * the incoming Next.js request.
 *
 * @param request  The incoming `NextRequest`.
 * @returns        The decoded `SessionPayload`, or `null` if the cookie is
 *                 absent or the token is invalid/expired.
 */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}
