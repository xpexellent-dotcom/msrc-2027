import "server-only";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";

export class WorkshopRpcMissingError extends Error {
  constructor() { super("Private workshop RPC not installed"); this.name = "WorkshopRpcMissingError"; }
}
export function createWorkshopParticipantBackend(config: ParticipantConfig): RegistrationBackend {
  const participant = createParticipantBackend(config);
  return {
    identity: participant.identity, refresh: participant.refresh,
    async rpc(name, args = {}) {
      if (["msrc_participant_status", "msrc_participant_form_claim"].includes(name)) return participant.rpc(name, args);
      if (!["msrc_workshop_participant_read", "msrc_workshop_participant_mutate"].includes(name)) throw new Error("Unknown private workshop RPC");
      const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/" + name, {
        method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      });
      if ([400, 404].includes(response.status)) {
        const value: unknown = await response.json().catch(() => null);
        if (value && typeof value === "object" && ["PGRST202", "42883"].includes(String((value as { code?: unknown }).code))) throw new WorkshopRpcMissingError();
        throw new Error("Private workshop RPC unavailable");
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error("Private workshop RPC unavailable"); }
      return response.json();
    },
  };
}
