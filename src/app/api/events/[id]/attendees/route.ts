import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireUser } from "@/lib/authMiddleware";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * GET /api/events/:id/attendees
 * Accessible by any authenticated user or admin.
 * Returns the list of confirmed attendees for the given event.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireUser(request);
  if (authError) return authError;

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const attendees = await db
      .collection("join_requests")
      .aggregate([
        { $match: { eventId: new ObjectId(id), status: "confirmed" } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            fullName: "$user.fullName",
            username: "$user.username",
          },
        },
        { $sort: { fullName: 1 } },
      ])
      .toArray();

    return NextResponse.json(attendees, { status: 200 });
  } catch (err) {
    console.error("[GET /api/events/:id/attendees]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
