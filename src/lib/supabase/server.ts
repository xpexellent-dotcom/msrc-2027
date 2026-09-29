import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import type { UnconfiguredDatabase } from "./unconfigured-database.types";

/** New anonymous client per call. No cookies, privileged key, or shared user session. */
export function createServerDataClient(target: "local"): SupabaseClient<Database> | null;
export function createServerDataClient(): SupabaseClient<UnconfiguredDatabase> | null;
export function createServerDataClient(target?: "local") {
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
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
    },
  };

  return target === "local"
    ? createClient<Database>(config.url, config.publishableKey, options)
    : createClient<UnconfiguredDatabase>(config.url, config.publishableKey, options);
}
