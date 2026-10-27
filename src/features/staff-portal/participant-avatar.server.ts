import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AVATAR_BUCKET, avatarObjectPattern } from "@/features/participant-accounts/profile-backend.server";
import type { StaffConfig } from "./config.server";

/** Called only after the audited participant-detail role/session authorization.
 * Keep the short-lived signed URL server-side so the existing image CSP holds. */
export async function downloadStaffParticipantAvatar(config: StaffConfig, object: string): Promise<Blob | null> {
  if (!avatarObjectPattern.test(object)) return null;
  const safeFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get("authorization") === "Bearer " + config.secretKey) headers.delete("authorization");
    return fetch(input, { ...init, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000) });
  };
  const storage = createClient(config.supabaseUrl, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch } }).storage.from(AVATAR_BUCKET);
  const signed = await storage.createSignedUrl(object, 60);
  if (signed.error || !signed.data?.signedUrl) return null;
  const url = new URL(signed.data.signedUrl);
  if (url.origin !== new URL(config.supabaseUrl).origin || !url.pathname.startsWith("/storage/v1/object/sign/" + AVATAR_BUCKET + "/")) return null;
  const response = await safeFetch(url);
  if (!response.ok) { await response.body?.cancel(); return null; }
  const blob = await response.blob();
  return blob.size <= 2 * 1024 * 1024 && blob.type === "image/webp" ? blob : null;
}
