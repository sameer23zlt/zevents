import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin, requireUser } from "@/lib/authMiddleware";
import { getSessionFromRequest } from "@/lib/auth";
import type { Event } from "@/types/models";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

/**
 * GET /api/events
 * Accessible by both User and Admin roles.
 * For a regular user, each event is annotated with `myStatus`
 * (the current user's join-request status for that event, if any).
 */
export async function GET(request: NextRequest) {
  const authError = await requireUser(request);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const events = await db
      .collection<Event>("events")
      .find(
        {},
        {
          projection: {
            _id: 1,
            title: 1,
            description: 1,
            amount: 1,
            capacity: 1,
            attendeeCount: 1,
            isFull: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    // Annotate each event with the signed-in user's request status.
    const session = await getSessionFromRequest(request);
    if (session && session.role === "user") {
      const requests = await db
        .collection("join_requests")
        .find(
          { userId: new (await import("mongodb")).ObjectId(session.sub) },
          { projection: { eventId: 1, status: 1 } }
        )
        .toArray();

      const statusByEvent = new Map(
        requests.map((r) => [r.eventId.toString(), r.status])
      );

      for (const event of events) {
        const s = statusByEvent.get(event._id.toString());
        (event as Event & { myStatus?: string }).myStatus =
          s ?? "none";
      }
    }

    return NextResponse.json(events, { status: 200 });
  } catch (err) {
    console.error("[GET /api/events]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

/**
 * POST /api/events
 * Admin-only. Creates a new event.
 * Validates required fields; returns 400 on validation failure.
 * Inserts with attendeeCount=0 and isFull=false.
 * Returns 201 with the created event document.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, amount, capacity } = body as {
    title?: unknown;
    description?: unknown;
    amount?: unknown;
    capacity?: unknown;
  };

  // Validate required fields
  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  if (
    !description ||
    typeof description !== "string" ||
    description.trim() === ""
  ) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return NextResponse.json(
      { error: "amount must be a number >= 0" },
      { status: 400 }
    );
  }

  const capacityNum = Number(capacity);
  if (!Number.isInteger(capacityNum) || capacityNum < 1) {
    return NextResponse.json(
      { error: "capacity must be an integer >= 1" },
      { status: 400 }
    );
  }

  const now = new Date();
  const newEvent: Omit<Event, "_id"> = {
    title: title.trim(),
    description: description.trim(),
    amount: amountNum,
    capacity: capacityNum,
    attendeeCount: 0,
    isFull: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const result = await db.collection<Omit<Event, "_id">>("events").insertOne(newEvent);

    const created = { _id: result.insertedId, ...newEvent };

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/events]", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
