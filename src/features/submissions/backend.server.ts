import "server-only";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";

export class AbstractRpcMissingError extends Error {
  constructor() { super("Private abstract RPC not installed"); this.name = "AbstractRpcMissingError"; }
}
export type AbstractBackend = RegistrationBackend;
export function createAbstractBackend(config: ParticipantConfig): AbstractBackend {
  const participant = createParticipantBackend(config);
  return { identity: participant.identity, refresh: participant.refresh, async rpc(name, args = {}) {
    if (name === "msrc_participant_status") return participant.rpc(name, args);
    if (!["msrc_participant_profile_complete", "msrc_abstracts_status", "msrc_abstracts_me", "msrc_abstracts_save_draft", "msrc_abstracts_finalize"].includes(name)) throw new Error("Unknown private abstract RPC");
    const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/" + name, {
      method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
    });
    if (response.status === 404) {
      const value: unknown = await response.json().catch(() => null);
      if (value && typeof value === "object" && (value as { code?: unknown }).code === "PGRST202") throw new AbstractRpcMissingError();
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error("Private abstract RPC unavailable"); }
    return response.json();
  } };
}
