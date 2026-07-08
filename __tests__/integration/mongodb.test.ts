/**
 * Integration test for the MongoDB connection used by Zevents.
 *
 * Connects to the database configured via MONGODB_URI / MONGODB_DB and
 * verifies that the connection is usable for basic read/write operations.
 *
 * This test talks to a *real* MongoDB instance, so it is skipped when
 * MONGODB_URI is not available. A short server-selection timeout makes the
 * test fail fast (instead of hanging) when the cluster is unreachable
 * (e.g. IP not allow-listed in Atlas Network Access).
 */

import fs from "fs";
import path from "path";
import { MongoClient, type Collection, type Document } from "mongodb";

// Jest does not load .env automatically, so read it if the var is missing.
if (!process.env.MONGODB_URI) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

const uri = process.env.MONGODB_URI;
const SERVER_SELECTION_MS = 8000;

const describeOrSkip = uri ? describe : describe.skip;

describeOrSkip("MongoDB connection", () => {
  const TEST_COLLECTION = "__zevents_connection_test__";
  let client: MongoClient;
  let collection: Collection<Document>;
  let dbName: string;

  beforeAll(async () => {
    // Import the app's singleton client (it connects on first use).
    const mod = await import("@/lib/mongodb");
    client = await mod.default;
    dbName = mod.dbName;

    // Give the shared client a bounded selection timeout for fail-fast.
    client.options.serverSelectionTimeoutMS = SERVER_SELECTION_MS;
    collection = client.db(dbName).collection(TEST_COLLECTION);
  }, SERVER_SELECTION_MS + 5000);

  afterAll(async () => {
    if (collection) {
      await collection.deleteMany({});
    }
    if (client) {
      await client.close();
    }
  });

  it("resolves the configured database name", () => {
    expect(typeof dbName).toBe("string");
    expect(dbName.length).toBeGreaterThan(0);
  });

  it("connects to MongoDB and responds to a ping", async () => {
    const result = await client.db(dbName).command({ ping: 1 });
    expect(result).toMatchObject({ ok: 1 });
  });

  it("can insert, read and delete a document", async () => {
    const doc = { probe: "zevents", createdAt: new Date() };
    const insert = await collection.insertOne(doc);
    expect(insert.acknowledged).toBe(true);

    const found = await collection.findOne({ _id: insert.insertedId });
    expect(found).not.toBeNull();
    expect(found?.probe).toBe("zevents");

    const del = await collection.deleteOne({ _id: insert.insertedId });
    expect(del.deletedCount).toBe(1);
  });

  it("enforces a unique index on users.username", async () => {
    const users = client.db(dbName).collection("users");
    const indexes = await users.indexes();
    const unique = indexes.find(
      (i) =>
        i.unique === true &&
        i.key &&
        (i.key as Record<string, number>).username === 1
    );
    expect(unique).toBeDefined();
  });
});
