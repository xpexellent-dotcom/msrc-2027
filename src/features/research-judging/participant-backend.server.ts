import "server-only";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";

export class ResearchParticipantRpcMissingError extends Error {
  constructor() { super("Private research event RPC not installed"); this.name = "ResearchParticipantRpcMissingError"; }
}
export function createResearchParticipantBackend(config: ParticipantConfig): RegistrationBackend {
  const participant = createParticipantBackend(config);
  return { identity: participant.identity, refresh: participant.refresh, async rpc(name, args = {}) {
    if (name === "msrc_participant_status") return participant.rpc(name, args);
    if (!["msrc_research_event_me", "msrc_research_event_supervisor"].includes(name)) throw new Error("Unknown private research event RPC");
    const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/" + name, {
      method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
    });
    if (response.status === 404) {
      const body: unknown = await response.json().catch(() => null);
      if (body && typeof body === "object" && (body as { code?: unknown }).code === "PGRST202") throw new ResearchParticipantRpcMissingError();
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error("Private research event RPC unavailable"); }
    return response.json();
  } };
}
