import "server-only";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";

export class ParticipantAnnouncementsRpcMissingError extends Error {
  constructor() { super("Private announcements RPC not installed"); this.name = "ParticipantAnnouncementsRpcMissingError"; }
}

export function createParticipantAnnouncementsBackend(config: ParticipantConfig): RegistrationBackend {
  const participant = createParticipantBackend(config);
  return {
    identity: participant.identity, refresh: participant.refresh,
    async rpc(name, args = {}) {
      if (name === "msrc_participant_status" || name === "msrc_participant_form_claim") return participant.rpc(name, args);
      if (name !== "msrc_participant_announcements") throw new Error("Unknown private announcements RPC");
      const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/" + name, {
        method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      });
      if (response.status === 404 || response.status === 400) {
        const body: unknown = await response.json().catch(() => null);
        if (body && typeof body === "object" && ["PGRST202", "42883"].includes(String((body as { code?: unknown }).code))) throw new ParticipantAnnouncementsRpcMissingError();
        throw new Error("Private announcements RPC unavailable");
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error("Private announcements RPC unavailable"); }
      return response.json();
    },
  };
}
