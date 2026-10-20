import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import type { RegistrationTicketResponse } from "./contracts";

const secretPattern = /^[a-f0-9]{64}$/i;
const tokenPattern = /^msrc1\.([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.([a-f0-9]{64})$/;
export function getRegistrationTicketSecret(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const secret = env.REGISTRATION_TICKET_SECRET;
  if (!secret || !secretPattern.test(secret)) return null;
  if ([env.REGISTRATION_IDENTITY_HMAC_SECRET, env.PARTICIPANT_AUTH_SECURITY_SECRET, env.STAFF_AUTH_SECURITY_SECRET]
    .some((other) => other?.toLowerCase() === secret.toLowerCase())) return null;
  try {
    const keys: unknown = JSON.parse(env.REGISTRATION_IDENTITY_ENCRYPTION_KEYS ?? "{}");
    if (keys && typeof keys === "object" && Object.values(keys).some((key) => typeof key === "string" && key.toLowerCase() === secret.toLowerCase())) return null;
  } catch { return null; }
  return secret;
}

/** Validates only the private RPC projection, never check-in entitlement. */
export async function registrationTicketProjection(value: unknown, secret: string): Promise<RegistrationTicketResponse | null> {
  if (!value || typeof value !== "object" || Array.isArray(value) || !secretPattern.test(secret)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !== "state,ticket" || data.state !== "ready") return null;
  if (data.ticket === null) return { state: "ready", ticket: null };
  if (!data.ticket || typeof data.ticket !== "object" || Array.isArray(data.ticket)) return null;
  const row = data.ticket as Record<string, unknown>;
  if (Object.keys(row).sort().join(",") !== "referenceCode,status,token" || !["issued", "revoked"].includes(String(row.status))
    || typeof row.referenceCode !== "string" || !/^[A-F0-9]{12}$/.test(row.referenceCode)) return null;
  if (row.status === "revoked") return row.token === null
    ? { state: "ready", ticket: { status: "revoked", referenceCode: row.referenceCode, qrDataUrl: null } } : null;
  const parts = typeof row.token === "string" && tokenPattern.exec(row.token);
  if (!parts || parts[1].replaceAll("-", "").slice(0, 12).toUpperCase() !== row.referenceCode) return null;
  const expected = createHmac("sha256", Buffer.from(secret, "hex")).update("msrc-ticket-v1:" + parts[1]).digest();
  if (!timingSafeEqual(expected, Buffer.from(parts[2], "hex"))) return null;
  const qrDataUrl = await QRCode.toDataURL(row.token as string, { type: "image/png", width: 320, margin: 4, errorCorrectionLevel: "M" });
  return { state: "ready", ticket: { status: "issued", referenceCode: row.referenceCode, qrDataUrl } };
}
