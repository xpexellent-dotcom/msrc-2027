import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createParticipantBackend, type NativeParticipantSession } from "./backend.server";
import type { ParticipantConfig } from "./config.server";

export const AVATAR_BUCKET = "participant-avatars";
export const avatarObjectPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;
export class ParticipantProfileRpcMissingError extends Error {
  constructor() { super("Private participant profile RPC not installed"); this.name = "ParticipantProfileRpcMissingError"; }
}
export interface ParticipantProfileBackend {
  rpc(name: string, args?: Record<string, unknown>): Promise<unknown>;
  identity(accessToken: string): Promise<string | null>;
  refresh(refreshToken: string): Promise<NativeParticipantSession | null>;
  upload(object: string, bytes: Uint8Array): Promise<boolean>;
  remove(object: string): Promise<boolean>;
  download(object: string): Promise<Blob | null>;
}
export function createParticipantProfileBackend(config: ParticipantConfig): ParticipantProfileBackend {
  const participant = createParticipantBackend(config);
  const safeFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get("authorization") === "Bearer " + config.secretKey) headers.delete("authorization");
    return fetch(input, { ...init, headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6_000) });
  };
  const storage = createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch },
  }).storage.from(AVATAR_BUCKET);
  const assertObject = (object: string) => { if (!avatarObjectPattern.test(object)) throw new Error("Invalid avatar object"); };
  return {
    identity: participant.identity, refresh: participant.refresh,
    async rpc(name, args = {}) {
      if (["msrc_participant_status", "msrc_participant_form_claim"].includes(name)) return participant.rpc(name, args);
      if (!/^msrc_participant_profile_(read|save|avatar_reserve|avatar_register|avatar_remove|avatar_abandon|cleanup|avatar_deleted)$/.test(name)) throw new Error("Unknown private profile RPC");
      const response = await safeFetch(config.supabaseUrl + "/rest/v1/rpc/" + name, {
        method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        if (response.status === 404 && body && typeof body === "object" && (body as { code?: unknown }).code === "PGRST202") throw new ParticipantProfileRpcMissingError();
        throw new Error("Private profile RPC unavailable");
      }
      return response.json();
    },
    async upload(object, bytes) { assertObject(object); return !(await storage.upload(object, bytes, { contentType: "image/webp", cacheControl: "0", upsert: false })).error; },
    async remove(object) { assertObject(object); return !(await storage.remove([object])).error; },
    async download(object) { assertObject(object); const result = await storage.download(object); return result.error ? null : result.data; },
  };
}
