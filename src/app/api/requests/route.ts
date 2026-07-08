import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/authMiddleware";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * GET /api/requests
 * Admin-only. Returns all join requests enriched with the requesting user's
 * name/username and the related event's title/amount.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const requests = await db
      .collection("join_requests")
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            user: {
              _id: "$user._id",
              fullName: "$user.fullName",
              username: "$user.username",
            },
            event: {
              _id: "$event._id",
              title: "$event.title",
              amount: "$event.amount",
            },
          },
        },
      ])
      .toArray();

    return NextResponse.json(requests, { status: 200 });
  } catch (err) {
    console.error("[GET /api/requests]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
