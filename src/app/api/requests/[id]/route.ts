import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/authMiddleware";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * PATCH /api/requests/:id
 * Admin-only. Confirms (after collecting payment) or rejects a join request.
 *   { status: "confirmed" }  -> marks the user as an attendee (increments event.attendeeCount)
 *   { status: "rejected" }   -> marks the request rejected
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;
  if (status !== "confirmed" && status !== "rejected") {
    return NextResponse.json(
      { error: "status must be 'confirmed' or 'rejected'" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const joinRequest = await db
      .collection("join_requests")
      .findOne({ _id: new ObjectId(id) });

    if (!joinRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (joinRequest.status === "confirmed" && status === "confirmed") {
      return NextResponse.json(
        { ok: true, status: "confirmed", unchanged: true },
        { status: 200 }
      );
    }

    const now = new Date();
    await db
      .collection("join_requests")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: now } }
      );

    // When confirming, increment the event's attendee count and flip isFull.
    if (status === "confirmed") {
      const eventId = joinRequest.eventId as ObjectId;
      const event = await db
        .collection("events")
        .findOne({ _id: eventId }, { projection: { capacity: 1, attendeeCount: 1 } });

      if (event) {
        const nextCount = (event.attendeeCount ?? 0) + 1;
        const isFull = nextCount >= (event.capacity ?? 0);
        await db.collection("events").updateOne(
          { _id: eventId },
          { $set: { attendeeCount: nextCount, isFull, updatedAt: now } }
        );
      }
    }

    return NextResponse.json({ ok: true, status }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/requests/:id]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
