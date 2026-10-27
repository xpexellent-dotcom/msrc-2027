import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { OutboxDatabaseConfig } from "./outbox-store.server";
import { AVATAR_BUCKET, avatarObjectPattern } from "@/features/participant-accounts/profile-backend.server";

export type ProfileCleanupResult = { state: "area-not-ready" } | { state: "updated"; erased: number; removed: number; pending: number };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Uses the existing authenticated cron. Cleanup continues if profile editing is
 * later disabled. Delete bytes via Storage API, then acknowledge durable work. */
export async function maintainParticipantProfiles(config: OutboxDatabaseConfig): Promise<ProfileCleanupResult> {
  const safeFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get("authorization") === "Bearer " + config.databaseKey) headers.delete("authorization");
    return fetch(input, { ...init, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3_000) });
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const response = await safeFetch(config.databaseUrl + "/rest/v1/rpc/" + name, { method: "POST",
      headers: { apikey: config.databaseKey, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const row = record(await response.json());
    if (!response.ok && response.status === 404 && row?.code === "PGRST202") return null;
    if (!response.ok || !row) throw new Error("Profile maintenance unavailable");
    return row;
  };
  const result = await rpc("msrc_participant_profile_cleanup", { batch_size: 10 });
  if (result === null) return { state: "area-not-ready" };
  if (result.state !== "ready" || !Number.isSafeInteger(result.erased) || Number(result.erased) < 0
    || !Array.isArray(result.objects) || result.objects.length > 10 || !result.objects.every((object) => typeof object === "string" && avatarObjectPattern.test(object))) throw new Error("Profile maintenance unavailable");
  const storage = createClient(config.databaseUrl, config.databaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch } }).storage.from(AVATAR_BUCKET);
  let removed = 0;
  // One bounded batch leaves time for the incumbent mail worker. Failed objects
  // remain queued without acknowledging deletion or logging private paths.
  if (result.objects.length) {
    const response = await storage.remove(result.objects);
    if (!response.error) {
      const receipt = await rpc("msrc_participant_profile_avatar_deleted_many", { object_names: result.objects });
      if (receipt?.state !== "ready") throw new Error("Profile maintenance unavailable");
      removed = result.objects.length;
    }
  }
  return { state: "updated", erased: Number(result.erased), removed, pending: result.objects.length - removed };
}
