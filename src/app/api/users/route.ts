import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/authMiddleware";
import type { User } from "@/types/models";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * GET /api/users
 * Admin-only. Returns every registered user with their approval status.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const users = await db
      .collection<User>("users")
      .find(
        {},
        {
          projection: {
            _id: 1,
            fullName: 1,
            username: 1,
            status: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
