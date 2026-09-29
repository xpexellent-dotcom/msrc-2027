import "client-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import type { UnconfiguredDatabase } from "./unconfigured-database.types";

/** Optional anonymous read client. This does not implement participant authentication. */
export function createBrowserDataClient(target: "local"): SupabaseClient<Database> | null;
export function createBrowserDataClient(): SupabaseClient<UnconfiguredDatabase> | null;
export function createBrowserDataClient(target?: "local") {
  const config = getSupabaseConfig();
  if (!config) return null;

  if (target === "local" && config.target !== "local") {
    throw new Error("Local fixture clients cannot connect to hosted Supabase.");
  }

  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };

  return target === "local"
    ? createClient<Database>(config.url, config.publishableKey, options)
    : createClient<UnconfiguredDatabase>(config.url, config.publishableKey, options);
}
