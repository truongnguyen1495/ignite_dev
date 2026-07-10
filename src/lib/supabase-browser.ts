"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Deliberately separate from supabase-admin.ts (no shared imports) so the
// service-role key can never end up in the client bundle — this client only
// ever holds the anon public key, and is used solely to receive Realtime
// Broadcast "something changed" pings (see src/lib/use-chat-broadcast.ts),
// never to read/write the database directly.
let client: SupabaseClient | undefined;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }

  client = createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}
