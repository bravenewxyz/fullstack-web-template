/**
 * Type-Safe Environment Configuration
 * 
 * Uses Zod for validation and type inference.
 * Fails fast on invalid configuration.
 */

import { serverEnvSchema, type ServerEnv } from "@shared/schemas";

// Parse and validate environment variables
function parseEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(result.error.format());
    
    // In development, continue with defaults for better DX
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️  Continuing with defaults in development mode");
      return serverEnvSchema.parse({});
    }
    
    process.exit(1);
  }

  return result.data;
}

const env = parseEnv();

// Detect self-hosted mode: Auth service runs on localhost:9999 internally
const isSelfHosted = env.SELF_HOSTED || env.GOTRUE_API_PORT === "9999";

// For self-hosted, use internal Auth service URL for server-side auth verification
const supabaseUrl = isSelfHosted
  ? "http://localhost:9999"
  : (env.VITE_SUPABASE_URL ?? "");

export const ENV = {
  // Core
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",

  // Database
  databaseUrl: env.DATABASE_URL ?? "",

  // Supabase
  supabaseUrl,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  isSelfHosted,

  // OpenRouter (LLM)
  openrouterApiKey: env.OPENROUTER_API_KEY ?? "",
  openrouterModel: env.OPENROUTER_MODEL,

  // Derived checks
  get supabaseEnabled(): boolean {
    return !!(this.supabaseUrl && this.supabaseServiceRoleKey);
  },
  get databaseEnabled(): boolean {
    return !!this.databaseUrl;
  },
  get llmEnabled(): boolean {
    return !!this.openrouterApiKey;
  },
} as const;

// Type export for use elsewhere
export type Env = typeof ENV;
