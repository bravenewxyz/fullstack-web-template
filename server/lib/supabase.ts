import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// Supabase admin client - only created when configured
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!ENV.supabaseEnabled) {
    return null;
  }
  
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      ENV.supabaseUrl,
      ENV.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  
  return _supabaseAdmin;
}

// For backward compatibility - will be null if Supabase not configured
export const supabaseAdmin = ENV.supabaseEnabled
  ? createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
