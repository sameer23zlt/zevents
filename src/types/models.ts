import { ObjectId } from "mongodb";

/**
 * Represents a registered community member.
 * Stored in the `users` MongoDB collection.
 */
export interface User {
  _id: ObjectId;
  /** User's display name */
  fullName: string;
  /** Unique login handle */
  username: string;
  /** Lifecycle status — starts as "pending" until Admin acts */
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

/**
 * Represents a scheduled activity (e.g. football or cricket match).
 * Stored in the `events` MongoDB collection.
 */
export interface Event {
  _id: ObjectId;
  title: string;
  description: string;
  /** Per-person participation fee (collected by the Admin) */
  amount: number;
  /** Maximum number of confirmed attendees */
  capacity: number;
  /** Denormalised count — updated atomically when a join request is confirmed */
  attendeeCount: number;
  /** true once attendeeCount >= capacity */
  isFull: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a User's request to attend an Event.
 * Stored in the `join_requests` MongoDB collection.
 * Compound unique index on (userId, eventId) enforces one active request per pair.
 */
export interface JoinRequest {
  _id: ObjectId;
  /** Reference to users._id */
  userId: ObjectId;
  /** Reference to events._id */
  eventId: ObjectId;
  /** Lifecycle status */
  status: "pending" | "confirmed" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The payload encoded inside the HTTP-only session JWT.
 */
export interface SessionPayload {
  /** ObjectId string for regular users, or the literal "admin" for the Admin */
  sub: string;
  role: "admin" | "user";
  username: string;
  /** Issued-at timestamp (seconds since epoch) */
  iat: number;
  /** Expiry timestamp (seconds since epoch) — 7 days after issuance */
  exp: number;
}
