import "server-only";
import { createParticipantBackend } from "@/features/participant-accounts/backend.server";
import type { ParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationBackend } from "@/features/registration/backend.server";

export class CertificateRpcMissingError extends Error {
  constructor() { super("Certificate area not installed"); this.name = "CertificateRpcMissingError"; }
}
export type CertificateDatabase = { databaseUrl: string; databaseKey: string };
/** Service-only transport. No session bearer, response body or request parameters are logged. */
export async function certificateRpc(config: CertificateDatabase, name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!/^msrc_certificates_(participant_read|participant_manage|download|verify|generation_claim|generation_finish)$/.test(name)) throw new Error("Unknown certificate operation");
  const response = await fetch(config.databaseUrl + "/rest/v1/rpc/" + name, {
    method: "POST", headers: { apikey: config.databaseKey, "Content-Type": "application/json" },
    body: JSON.stringify(args), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) {
    const value: unknown = await response.json().catch(() => null);
    if (value && typeof value === "object" && ["PGRST202", "42883"].includes(String((value as { code?: unknown }).code))) throw new CertificateRpcMissingError();
    throw new Error("Certificate operation unavailable");
  }
  return response.json();
}
export function createCertificateParticipantBackend(config: ParticipantConfig): RegistrationBackend {
  const participant = createParticipantBackend(config);
  return { identity: participant.identity, refresh: participant.refresh,
    rpc: (name, args = {}) => ["msrc_participant_status", "msrc_participant_form_claim"].includes(name)
      ? participant.rpc(name, args) : certificateRpc({ databaseUrl: config.supabaseUrl, databaseKey: config.secretKey }, name, args) };
}
