import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { isIP } from "node:net";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import { getStaffConfig } from "@/features/staff-portal/config.server";
import { certificateObject, decodeCertificateVerification, type VerificationResult } from "@/lib/certificates/contracts";
import { certificateRpc, CertificateRpcMissingError, type CertificateDatabase } from "./backend.server";

/** Trusted platform header only. Never retain IP/code pairs, raw URLs or feedback bodies. */
export async function verifyCertificate(code: string, ip: string, config: CertificateDatabase & { securitySecret: string }, rpc = certificateRpc): Promise<VerificationResult> {
  if (!/^[a-f0-9]{48,64}$/.test(code)) return { state: "not-found" };
  if (!isIP(ip)) return { state: "unavailable" };
  const rateKey = createHmac("sha256", Buffer.from(config.securitySecret, "hex")).update("certificate-verify-v1:" + ip).digest("hex");
  try {
    const value = await rpc(config, "msrc_certificates_verify", { code, rate_key: rateKey });
    const certificate = decodeCertificateVerification(value);
    if (certificate) return { state: "ready", certificate };
    const state = certificateObject(value)?.state;
    return { state: state === "not_found" ? "not-found" : state === "rate_limited" ? "limited" : "unavailable" };
  } catch (error) { return { state: error instanceof CertificateRpcMissingError ? "area-not-ready" : "unavailable" }; }
}
export async function readCertificateVerification(code: string): Promise<VerificationResult> {
  if (process.env.CERTIFICATES_ENABLED !== "true") return { state: "closed" };
  const participant = getParticipantConfig(), staff = getStaffConfig();
  const config = participant.state === "ready" ? participant.config : staff.state === "ready" ? staff.config : null;
  if (!config) return { state: "closed" };
  const current = await headers();
  const ip = config.testMode ? "127.0.0.1" : current.get("x-vercel-forwarded-for") ?? "";
  return verifyCertificate(code, ip, { databaseUrl: config.supabaseUrl, databaseKey: config.secretKey, securitySecret: config.securitySecret });
}
