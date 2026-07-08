import { NextRequest, NextResponse } from "next/server";
import { MongoServerError } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { User } from "@/types/models";

const DB_NAME = process.env.MONGODB_DB ?? "zevents";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { fullName, username } = (body ?? {}) as Record<string, unknown>;

  // Validate required fields
  if (
    !fullName ||
    typeof fullName !== "string" ||
    fullName.trim() === "" ||
    !username ||
    typeof username !== "string" ||
    username.trim() === ""
  ) {
    return NextResponse.json(
      { error: "fullName and username are required" },
      { status: 400 }
    );
  }

  const trimmedFullName = fullName.trim();
  const trimmedUsername = username.trim();

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const usersCollection = db.collection<Omit<User, "_id">>("users");

    const newUser = {
      fullName: trimmedFullName,
      username: trimmedUsername,
      status: "pending" as const,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: result.insertedId.toString(),
          fullName: trimmedFullName,
          username: trimmedUsername,
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Duplicate key error — username already taken
    if (
      error instanceof MongoServerError &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    console.error("[POST /api/users/register]", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
