/**
 * Smoke test — verifies the project scaffolding is correct:
 * - TypeScript types are importable
 * - Jest + ts-jest configuration works
 */

import type { User, Event, JoinRequest, SessionPayload } from "@/types/models";

describe("Project scaffolding", () => {
  it("imports TypeScript model types without error", () => {
    // Type-only import — if the module resolves and TypeScript compiles,
    // this assertion simply confirms the import path is wired correctly.
    const user: Partial<User> = { username: "testuser", status: "pending" };
    expect(user.status).toBe("pending");
  });

  it("SessionPayload type has the expected roles", () => {
    const adminPayload: Partial<SessionPayload> = {
      sub: "admin",
      role: "admin",
      username: "admin",
    };
    expect(adminPayload.role).toBe("admin");

    const userPayload: Partial<SessionPayload> = {
      sub: "64abc123",
      role: "user",
      username: "alice",
    };
    expect(userPayload.role).toBe("user");
  });

  it("Event type has required capacity and attendance fields", () => {
    const event: Partial<Event> = {
      title: "Football Match",
      capacity: 10,
      attendeeCount: 0,
      isFull: false,
    };
    expect(event.isFull).toBe(false);
    expect(event.attendeeCount).toBe(0);
  });

  it("JoinRequest type has valid statuses", () => {
    const statuses: JoinRequest["status"][] = ["pending", "confirmed", "rejected"];
    expect(statuses).toHaveLength(3);
  });
});
