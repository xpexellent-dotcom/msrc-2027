import "client-only";

import { createClient } from "@supabase/supabase-js";
import { getLocalSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/** Optional anonymous read client. This does not implement participant authentication. */
export function createBrowserDataClient() {
  const config = getLocalSupabaseConfig();
  if (!config) return null;

  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
