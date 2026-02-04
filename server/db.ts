import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { globalCounter, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./lib/env";
import { logger } from "./lib/logSession";

const log = logger.child("Database");

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance.
export async function getDb() {
  if (!_db) {
    try {
      const client = postgres(ENV.databaseUrl);
      _db = drizzle(client);
    } catch (error) {
      log.warn("Failed to connect", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.supabaseId) {
    throw new Error("User supabaseId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    log.warn("Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      supabaseId: user.supabaseId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.supabaseId,
      set: updateSet,
    });
  } catch (error) {
    log.error("Failed to upsert user", error);
    throw error;
  }
}

export async function getUserBySupabaseId(supabaseId: string) {
  const db = await getDb();
  if (!db) {
    log.warn("Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// Global Counter (Server State Demo)
// ============================================================================

const COUNTER_ID = 1;

/**
 * Get the current counter value. Creates the row if it doesn't exist.
 */
export async function getCounter(): Promise<number> {
  const db = await getDb();
  if (!db) {
    log.warn("Cannot get counter: database not available");
    return 0;
  }

  // Try to get existing counter
  const result = await db
    .select()
    .from(globalCounter)
    .where(eq(globalCounter.id, COUNTER_ID))
    .limit(1);

  if (result.length > 0) {
    return result[0].value;
  }

  // Create counter if it doesn't exist
  await db.insert(globalCounter).values({ id: COUNTER_ID, value: 0 });
  return 0;
}

/**
 * Increment the counter and return the new value.
 */
export async function incrementCounter(): Promise<number> {
  const db = await getDb();
  if (!db) {
    log.warn("Cannot increment counter: database not available");
    return 0;
  }

  // Ensure counter exists
  await getCounter();

  // Increment atomically
  const result = await db
    .update(globalCounter)
    .set({
      value: sql`${globalCounter.value} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(globalCounter.id, COUNTER_ID))
    .returning({ value: globalCounter.value });

  return result[0]?.value ?? 0;
}

/**
 * Decrement the counter and return the new value.
 */
export async function decrementCounter(): Promise<number> {
  const db = await getDb();
  if (!db) {
    log.warn("Cannot decrement counter: database not available");
    return 0;
  }

  // Ensure counter exists
  await getCounter();

  // Decrement atomically
  const result = await db
    .update(globalCounter)
    .set({
      value: sql`${globalCounter.value} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(globalCounter.id, COUNTER_ID))
    .returning({ value: globalCounter.value });

  return result[0]?.value ?? 0;
}
