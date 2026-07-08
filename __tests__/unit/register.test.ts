/**
 * Unit tests for POST /api/users/register
 * Tests validation, success, and duplicate-username error paths.
 */

import { NextRequest } from "next/server";
import { MongoServerError } from "mongodb";

// ── Mock the MongoDB singleton ────────────────────────────────────────────────
// We use a module-level object so the jest.mock factory (which is hoisted)
// can reference it without a temporal-dead-zone error.
const db = {
  insertOne: jest.fn(),
};

jest.mock("@/lib/mongodb", () =>
  Promise.resolve({
    db: () => ({
      collection: () => ({ insertOne: db.insertOne }),
    }),
  })
);

// Import the route handler AFTER the mock is set up
import { POST } from "@/app/api/users/register/route";

// ── Helper: build a NextRequest with a JSON body ──────────────────────────────
function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Helper: build a MongoServerError for duplicate-key scenarios ─────────────
function makeDuplicateKeyError(): MongoServerError {
  const err = new MongoServerError({ message: "E11000 duplicate key error" });
  err.code = 11000;
  return err;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/users/register", () => {
  beforeEach(() => {
    db.insertOne.mockReset();
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it("returns 400 when fullName is missing", async () => {
    const res = await POST(makeRequest({ username: "alice" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when username is missing", async () => {
    const res = await POST(makeRequest({ fullName: "Alice Smith" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when fullName is blank whitespace", async () => {
    const res = await POST(makeRequest({ fullName: "   ", username: "alice" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when username is an empty string", async () => {
    const res = await POST(makeRequest({ fullName: "Alice Smith", username: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing both fields", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Success ─────────────────────────────────────────────────────────────────

  it("returns 201 with user object on successful registration", async () => {
    db.insertOne.mockResolvedValueOnce({ insertedId: { toString: () => "abc123" } });

    const res = await POST(
      makeRequest({ fullName: "Alice Smith", username: "alice" })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toBe("Registration successful");
    expect(json.user).toMatchObject({
      id: "abc123",
      fullName: "Alice Smith",
      username: "alice",
      status: "pending",
    });
  });

  it("inserts the user with status 'pending' into the users collection", async () => {
    db.insertOne.mockResolvedValueOnce({ insertedId: { toString: () => "def456" } });

    await POST(makeRequest({ fullName: "Bob Jones", username: "bob" }));

    expect(db.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Bob Jones",
        username: "bob",
        status: "pending",
      })
    );
  });

  it("trims whitespace from fullName and username before inserting", async () => {
    db.insertOne.mockResolvedValueOnce({ insertedId: { toString: () => "ghi789" } });

    const res = await POST(
      makeRequest({ fullName: "  Carol White  ", username: "  carol  " })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user.fullName).toBe("Carol White");
    expect(json.user.username).toBe("carol");

    expect(db.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Carol White", username: "carol" })
    );
  });

  // ── Duplicate username ───────────────────────────────────────────────────────

  it("returns 409 with 'Username already taken' on duplicate username", async () => {
    db.insertOne.mockRejectedValueOnce(makeDuplicateKeyError());

    const res = await POST(
      makeRequest({ fullName: "Alice Again", username: "alice" })
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Username already taken");
  });

  // ── Infrastructure error ─────────────────────────────────────────────────────

  it("returns 503 when MongoDB throws an unexpected error", async () => {
    db.insertOne.mockRejectedValueOnce(new Error("Connection refused"));

    const res = await POST(
      makeRequest({ fullName: "Dave", username: "dave" })
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("Service unavailable");
  });
});
