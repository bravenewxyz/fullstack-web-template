/**
 * Centralized Zod Schemas
 * 
 * Single source of truth for all type definitions.
 * Used for validation and type inference.
 */

import { z } from "zod";

// ============================================================================
// Environment Configuration
// ============================================================================

export const serverEnvSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().optional(),

  // Supabase
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Self-hosted detection
  SELF_HOSTED: z.coerce.boolean().optional(),
  GOTRUE_API_PORT: z.string().optional(),

  // OpenRouter (LLM)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("google/gemini-2.0-flash-001"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ============================================================================
// Socket.IO Event Schemas
// ============================================================================

// Payloads
export const stateInitPayload = z.object({
  counter: z.number(),
  users: z.number(),
});

export const counterUpdatePayload = z.number();
export const usersCountPayload = z.number();

// Type-safe event types for Socket.IO
export type ServerToClientEvents = {
  "state:init": (payload: z.infer<typeof stateInitPayload>) => void;
  "counter:update": (payload: z.infer<typeof counterUpdatePayload>) => void;
  "users:count": (payload: z.infer<typeof usersCountPayload>) => void;
};

export type ClientToServerEvents = {
  "counter:increment": () => void;
  "counter:decrement": () => void;
};

export type StateInit = z.infer<typeof stateInitPayload>;

// ============================================================================
// API Procedure Schemas
// ============================================================================

export const healthInputSchema = z.object({
  timestamp: z.number().min(0, "timestamp cannot be negative"),
});

export const healthOutputSchema = z.object({
  ok: z.boolean(),
});

export const counterOutputSchema = z.number();
