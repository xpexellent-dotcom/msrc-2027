import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";

export interface CompetitionStorage { sign(path: string, upload: boolean): Promise<string> }
/** Paths come from the authorized DB reservation; callers never select a bucket. */
export function createCompetitionStorage(config: Pick<ParticipantConfig, "supabaseUrl" | "secretKey">): CompetitionStorage {
  const client = createClient(config.supabaseUrl, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { async sign(path, upload) {
    const bucket = client.storage.from("msrc-competition-files");
    const result = upload ? await bucket.createSignedUploadUrl(path, { upsert: false }) : await bucket.createSignedUrl(path, 60, { download: true });
    if (result.error || !result.data?.signedUrl) throw new Error("Private file transfer unavailable");
    const url = new URL(result.data.signedUrl);
    if (url.origin !== new URL(config.supabaseUrl).origin || !url.pathname.startsWith(upload ? "/storage/v1/object/upload/sign/msrc-competition-files/" : "/storage/v1/object/sign/msrc-competition-files/")) throw new Error("Invalid private file URL");
    return url.href;
  } };
}
