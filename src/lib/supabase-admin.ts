import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

// Shared service-role client for every server-side storage helper (lesson
// images, library files, ...) — one cached instance per process instead of
// one per bucket-specific module.
export function getSupabaseAdmin() {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase storage.");
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  globalForSupabase.supabaseAdmin = client;
  return client;
}
