import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Get Supabase URL - in self-hosted mode on Railway, use /auth path on same origin
const getSupabaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (envUrl) return envUrl;
  
  // Self-hosted mode: Auth service is proxied at /auth on same origin
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth`;
  }
  return "http://localhost:3000/auth";
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create a mock client that doesn't error but does nothing
const createMockClient = (): SupabaseClient => {
  const noop = () => Promise.resolve({ data: null, error: null });
  const noopSync = () => ({ data: { subscription: { unsubscribe: () => {} } } });
  
  return {
    auth: {
      getSession: noop,
      getUser: noop,
      signOut: noop,
      signInWithPassword: noop,
      signInWithOAuth: noop,
      signUp: noop,
      onAuthStateChange: noopSync,
    },
  } as unknown as SupabaseClient;
};

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();
