import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getLocalSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/** New anonymous client per call. No cookies, privileged key, or shared user session. */
export function createServerDataClient() {
  const config = getLocalSupabaseConfig();
  if (!config) return null;

  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
