import "server-only";
import { createParticipantBackend, type NativeParticipantSession } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";

export interface RegistrationBackend {
  rpc(name: string, args?: Record<string, unknown>): Promise<unknown>;
  identity(accessToken: string): Promise<string | null>;
  refresh(refreshToken: string): Promise<NativeParticipantSession | null>;
}

export function createRegistrationBackend(config: ParticipantConfig): RegistrationBackend {
  const participant = createParticipantBackend(config);
  return {
    identity: participant.identity,
    refresh: participant.refresh,
    async rpc(name, args = {}) {
      if (name === "msrc_participant_status" || name === "msrc_participant_form_claim") return participant.rpc(name, args);
      if (!["msrc_registration_status", "msrc_registration_context", "msrc_registration_submit"].includes(name)) throw new Error("Unknown private RPC");
      const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/" + name, {
        method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error("Private registration RPC unavailable"); }
      return response.json();
    },
  };
}
