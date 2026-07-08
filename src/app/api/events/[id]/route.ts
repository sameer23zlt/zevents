import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/authMiddleware";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * PATCH /api/events/:id
 * Admin-only. Edits an existing event's fields.
 * Body may include any of: title, description, amount, capacity.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const set: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim() !== "") {
    set.title = body.title.trim();
  }
  if (typeof body.description === "string" && body.description.trim() !== "") {
    set.description = body.description.trim();
  }
  if (typeof body.amount === "number" && body.amount >= 0) {
    set.amount = body.amount;
  }
  if (
    typeof body.capacity === "number" &&
    Number.isInteger(body.capacity) &&
    body.capacity >= 1
  ) {
    set.capacity = body.capacity;
  }

  if (Object.keys(set).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  set.updatedAt = new Date();

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const eventId = new ObjectId(id);

    const event = await db.collection("events").findOne({ _id: eventId });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Keep isFull consistent if capacity changed.
    if (set.capacity !== undefined) {
      const attendeeCount = event.attendeeCount ?? 0;
      set.isFull = attendeeCount >= (set.capacity as number);
    }

    const result = await db
      .collection("events")
      .updateOne({ _id: eventId }, { $set: set });

    const updated = await db
      .collection("events")
      .findOne({ _id: eventId });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/events/:id]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

/**
 * DELETE /api/events/:id
 * Admin-only. Deletes an event and all of its join requests.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const eventId = new ObjectId(id);

    const event = await db.collection("events").findOne({ _id: eventId });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await db.collection("join_requests").deleteMany({ eventId });
    await db.collection("events").deleteOne({ _id: eventId });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/events/:id]", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
