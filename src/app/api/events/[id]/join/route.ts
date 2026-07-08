import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireUser } from "@/lib/authMiddleware";
import { getSessionFromRequest } from "@/lib/auth";
import type { JoinRequest } from "@/types/models";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * POST /api/events/:id/join
 * User-only. Marks the signed-in user as "IN" for an event, creating a
 * pending join request that the Admin must confirm after collecting payment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireUser(request);
  if (authError) return authError;

  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "user") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const userId = new ObjectId(session.sub);
  const eventId = new ObjectId(id);

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const event = await db
      .collection("events")
      .findOne({ _id: eventId }, { projection: { isFull: 1 } });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isFull) {
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
    }

    // Upsert-style guard: one active request per (user, event).
    const existing = await db.collection<JoinRequest>("join_requests").findOne({
      userId,
      eventId,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already requested to join this event" },
        { status: 409 }
      );
    }

    const now = new Date();

    // A previously rejected request is re-sent (reused) rather than duplicated.
    const rejected = await db
      .collection<JoinRequest>("join_requests")
      .findOne({ userId, eventId, status: "rejected" });

    if (rejected) {
      await db
        .collection("join_requests")
        .updateOne(
          { _id: rejected._id },
          { $set: { status: "pending", updatedAt: now } }
        );
      return NextResponse.json(
        { message: "Request re-sent to admin", status: "pending" },
        { status: 200 }
      );
    }

    const requestDoc: Omit<JoinRequest, "_id"> = {
      userId,
      eventId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<Omit<JoinRequest, "_id">>("join_requests").insertOne(requestDoc);

    return NextResponse.json(
      { message: "Request sent to admin", status: "pending" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/events/:id/join]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
