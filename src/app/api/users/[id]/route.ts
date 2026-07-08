import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/authMiddleware";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * PATCH /api/users/:id
 * Admin-only. Approves or rejects a pending user account.
 * Body: { status: "approved" | "rejected" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/users/:id]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

/**
 * DELETE /api/users/:id
 * Admin-only. Removes a user account and cleans up their join requests.
 * If the user was a confirmed attendee of any event, that event's
 * attendee count (and isFull flag) is decremented accordingly.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const userId = new ObjectId(id);

    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Decrement attendee counts for any events the user was confirmed for.
    const confirmed = await db
      .collection("join_requests")
      .find({ userId, status: "confirmed" }, { projection: { eventId: 1 } })
      .toArray();

    for (const req of confirmed) {
      const eventId = req.eventId as ObjectId;
      const event = await db
        .collection("events")
        .findOne({ _id: eventId }, { projection: { capacity: 1, attendeeCount: 1 } });
      if (event) {
        const nextCount = Math.max(0, (event.attendeeCount ?? 1) - 1);
        const isFull = nextCount >= (event.capacity ?? 0);
        await db
          .collection("events")
          .updateOne(
            { _id: eventId },
            { $set: { attendeeCount: nextCount, isFull, updatedAt: new Date() } }
          );
      }
    }

    await db.collection("join_requests").deleteMany({ userId });
    await db.collection("users").deleteOne({ _id: userId });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/users/:id]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
