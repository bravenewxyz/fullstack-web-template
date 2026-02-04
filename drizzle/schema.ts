import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Supabase user ID from auth.users. Unique per user. */
  supabaseId: text("supabase_id").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("login_method"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Global counter for demonstrating persisted server state.
 * Single row table pattern - always use id=1.
 */
export const globalCounter = pgTable("global_counter", {
  id: serial("id").primaryKey(),
  value: integer("value").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GlobalCounter = typeof globalCounter.$inferSelect;
