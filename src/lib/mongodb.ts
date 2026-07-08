/**
 * MongoDB singleton client for Zevents.
 *
 * Uses a module-level cache to avoid creating multiple connections during
 * Next.js serverless warm-starts / hot-reloads.
 *
 * On connect it also ensures the required indexes exist:
 *   - users.username  (unique)  — enforces unique usernames
 *
 * Usage:
 *   import clientPromise from "@/lib/mongodb";
 *   const client = await clientPromise;
 *   const db = client.db();
 */

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "Missing environment variable: MONGODB_URI. " +
      "Add it to your .env.local file."
  );
}

const DB_NAME = process.env.MONGODB_DB;

async function ensureIndexes(db: Db) {
  await db
    .collection("users")
    .createIndex({ username: 1 }, { unique: true });
}

// Extend the global NodeJS namespace so we can cache the client across
// hot-module reloads in development without TypeScript complaining.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

async function connect(): Promise<MongoClient> {
  const client = new MongoClient(uri);
  await client.connect();
  await ensureIndexes(client.db(DB_NAME));
  return client;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the MongoClient
  // is not re-instantiated on every hot reload.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production / test, always create a fresh connection.
  clientPromise = connect();
}

export const dbName = DB_NAME;
export default clientPromise;
