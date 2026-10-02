import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import { parsePersistedAccessContext, type PersistedAccessContext } from "@/lib/permissions/persisted-context";

export type AccessContextResult =
  | Readonly<{ state: "verified"; context: PersistedAccessContext }>
  | Readonly<{ state: "denied" }>
  | Readonly<{ state: "unavailable" }>;

type IdentityDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: { msrc_access_context: { Args: { edition_key: string }; Returns: unknown } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** No login, refresh, session persistence, service key, resource reader or workflow activation. */
export async function readVerifiedAccessContext(accessToken: string, editionId: string): Promise<AccessContextResult> {
  // Transport/parser limits, not event or business values. Never echo rejected credentials.
  if (typeof accessToken !== "string" || accessToken.length === 0 || accessToken.length > 16384 || /\s/.test(accessToken) ||
    typeof editionId !== "string" || editionId.length === 0 || editionId.length > 128 || editionId.trim() !== editionId) {
    return { state: "denied" };
  }
  try {
    const config = getSupabaseConfig();
    if (!config) return { state: "unavailable" };
    const client = createClient<IdentityDatabase>(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
    const identity = await client.auth.getUser(accessToken);
    if (identity.error || !identity.data.user) return { state: "denied" };
    const current = await client.rpc("msrc_access_context", { edition_key: editionId });
    if (current.error) return { state: "unavailable" };
    const context = parsePersistedAccessContext(current.data, identity.data.user.id, editionId);
    return context ? { state: "verified", context } : { state: "denied" };
  } catch {
    return { state: "unavailable" };
  }
}
