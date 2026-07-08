import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: { username?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password } = body;

  if (typeof username !== "string" || !username) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // --- Admin login ---
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (
    adminUsername &&
    adminPassword &&
    username === adminUsername &&
    typeof password === "string" &&
    password === adminPassword
  ) {
    const token = await signToken({ sub: "admin", role: "admin", username });

    const response = NextResponse.json(
      { role: "admin", username },
      { status: 200 }
    );

    response.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  }

  // If the username matches admin but credentials were wrong, return 401
  if (username === adminUsername) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // --- User login ---
  const DB_NAME = process.env.MONGODB_DB ?? "zevents";
  let client;
  try {
    client = await clientPromise;
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const db = client.db(DB_NAME);
  const user = await db.collection("users").findOne({ username });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.status === "pending") {
    return NextResponse.json(
      { error: "Your account is awaiting approval" },
      { status: 403 }
    );
  }

  if (user.status === "rejected") {
    return NextResponse.json(
      { error: "Your account has been rejected" },
      { status: 403 }
    );
  }

  // status === "approved"
  const token = await signToken({
    sub: user._id.toString(),
    role: "user",
    username: user.username,
  });

  const response = NextResponse.json(
    { role: "user", username: user.username },
    { status: 200 }
  );

  response.cookies.set("session", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
