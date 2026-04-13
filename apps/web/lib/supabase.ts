import { createClient } from "@supabase/supabase-js";
import type { DBSession, DBTransaction, DBService } from "@/lib/types";

// Server-side DB credentials. Never use NEXT_PUBLIC_* keys for write access.
const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Supabase client — used for all database operations.
 * Returns null when credentials are not configured (falls back to in-memory).
 */
export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const isSupabaseConfigured = Boolean(supabase);

export type { DBSession, DBTransaction, DBService };
