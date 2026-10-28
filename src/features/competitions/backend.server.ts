import "server-only";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";

export class CompetitionRpcMissingError extends Error {
  constructor() { super("Private competition RPC not installed"); this.name = "CompetitionRpcMissingError"; }
}
export type CompetitionBackend = RegistrationBackend;
export function createCompetitionBackend(config: ParticipantConfig): CompetitionBackend {
  const participant = createParticipantBackend(config);
  return { identity: participant.identity, refresh: participant.refresh, async rpc(name, args = {}) {
    if (name === "msrc_participant_status") return participant.rpc(name, args);
    if (!["msrc_participant_profile_complete", "msrc_competitions_status", "msrc_competitions_me", "msrc_competitions_save_draft", "msrc_competitions_submit", "msrc_competitions_member_action", "msrc_competitions_file_action", "msrc_competitions_hackathon_action"].includes(name)) throw new Error("Unknown competition RPC");
    const response = await fetch(config.supabaseUrl + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: config.secretKey, "Content-Type": "application/json" },
      body: JSON.stringify(args), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000) });
    if (response.status === 404) { const body: unknown = await response.json().catch(() => null);
      if (body && typeof body === "object" && (body as { code?: unknown }).code === "PGRST202") throw new CompetitionRpcMissingError(); }
    if (!response.ok) { await response.body?.cancel(); throw new Error("Competition RPC unavailable"); }
    return response.json();
  } };
}
