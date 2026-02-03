// Detect self-hosted mode: GoTrue runs on localhost:9999 internally
const isSelfHosted = process.env.SELF_HOSTED === "true" || process.env.GOTRUE_API_PORT === "9999";

// For self-hosted, use internal GoTrue URL for server-side auth verification
const supabaseUrl = isSelfHosted 
  ? "http://localhost:9999" 
  : (process.env.VITE_SUPABASE_URL ?? "");

export const ENV = {
  supabaseUrl,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  isSelfHosted,
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001",
  
  // Derived: check if Supabase is configured
  get supabaseEnabled(): boolean {
    return !!(this.supabaseUrl && this.supabaseServiceRoleKey);
  },
};
