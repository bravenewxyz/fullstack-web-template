import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSupabaseAdmin } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    const supabaseAdmin = getSupabaseAdmin();
    
    if (authHeader?.startsWith("Bearer ") && supabaseAdmin) {
      const token = authHeader.slice(7);
      const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && supabaseUser) {
        // Get or create user in our database
        let dbUser = await db.getUserBySupabaseId(supabaseUser.id);

        if (!dbUser) {
          // First time user - create in database
          await db.upsertUser({
            supabaseId: supabaseUser.id,
            email: supabaseUser.email ?? null,
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
            loginMethod: supabaseUser.app_metadata?.provider ?? null,
            lastSignedIn: new Date(),
          });
          dbUser = await db.getUserBySupabaseId(supabaseUser.id);
        } else {
          // Update last signed in
          await db.upsertUser({
            supabaseId: supabaseUser.id,
            lastSignedIn: new Date(),
          });
        }

        user = dbUser ?? null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
