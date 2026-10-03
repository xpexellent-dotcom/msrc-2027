import "server-only";

import { createHmac, randomInt, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MANAGED_STAFF_EMAIL_READY = false as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Principal = Readonly<{ actorId: string; sessionId: string; email: string }>;
type Binding = Readonly<{ actorId: string; sessionId: string; challengeId: string }>;
export interface StaffEmailStore {
  begin(input: Binding & { codeHash: string; ipHash: string }): Promise<unknown>;
  delivery(input: Binding & { delivered: boolean }): Promise<unknown>;
  consume(input: Binding & { codeHash: string }): Promise<unknown>;
}
export type StaffEmailDelivery = (message: Readonly<{ recipient: string; subject: string; text: string;
  language: "en" }>) => Promise<boolean>;
export type StaffEmailResult = Readonly<{ state: "issued"; challengeId: string; expiresAt: string }>
  | Readonly<{ state: "verified" }> | Readonly<{ state: "denied"; code: "not_authorized" | "retry_limited" }>
  | Readonly<{ state: "unavailable" }>;
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Inject a trusted server client; the database itself restricts these RPCs to service_role. */
export function createSupabaseStaffEmailStore(client: Pick<SupabaseClient, "rpc">): StaffEmailStore {
  async function call(name: string, args: Record<string, string | boolean>) {
    try {
      const result = await client.rpc(name, args);
      if (result.error) throw new Error("Staff email verification storage is unavailable.");
      return result.data as unknown;
    } catch { throw new Error("Staff email verification storage is unavailable."); }
  }
  const bound = (input: Binding) => ({ actor_id: input.actorId, session_id: input.sessionId, challenge_id: input.challengeId });
  return Object.freeze({
    begin: (input: Parameters<StaffEmailStore["begin"]>[0]) => call("msrc_staff_email_begin", { ...bound(input), code_hash: input.codeHash, ip_hash: input.ipHash }),
    delivery: (input: Parameters<StaffEmailStore["delivery"]>[0]) => call("msrc_staff_email_delivery", { ...bound(input), delivered: input.delivered }),
    consume: (input: Parameters<StaffEmailStore["consume"]>[0]) => call("msrc_staff_email_consume", { ...bound(input), code_hash: input.codeHash }),
  });
}

/** Injectable server contract. No live route, default SMTP, key or approval is configured. */
export function createStaffEmailCheck(options: Readonly<{ auth: SupabaseClient["auth"]; store: StaffEmailStore;
  deliver: StaffEmailDelivery; secret: string }>) {
  if (!/^[0-9a-f]{64}$/i.test(options.secret)) throw new Error("Staff email credential protection is unavailable.");
  const mac = (value: string) => createHmac("sha256", Buffer.from(options.secret, "hex")).update(value).digest("hex");
  const codeHash = (binding: Binding, code: string) => mac(`staff-email:${binding.actorId}:${binding.sessionId}:${binding.challengeId}:${code}`);
  const denied = (value?: unknown): StaffEmailResult => ({ state: "denied",
    code: record(value) && value.code === "retry_limited" ? "retry_limited" : "not_authorized" });

  async function principal(accessToken: string): Promise<Principal | null> {
    if (typeof accessToken !== "string" || accessToken.length > 16_384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken)) return null;
    // getUser verifies this exact bearer with managed Auth before claims are decoded.
    const result = await options.auth.getUser(accessToken);
    const user = result.data.user;
    if (result.error || !user || !uuid.test(user.id) || user.is_anonymous === true
      || !user.email || !user.email_confirmed_at) return null;
    const claims: unknown = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"));
    if (!record(claims) || claims.sub !== user.id || typeof claims.session_id !== "string" || !uuid.test(claims.session_id)) return null;
    // The store independently rechecks current native session/password, role tier,
    // verified email, versions, expiry and revocation inside each transaction.
    return { actorId: user.id, sessionId: claims.session_id, email: user.email };
  }

  return Object.freeze({
    async issue(accessToken: string, trustedRequestIp: string): Promise<StaffEmailResult> {
      let binding: Binding | null = null;
      try {
        if (typeof trustedRequestIp !== "string" || !isIP(trustedRequestIp)) return denied();
        const actor = await principal(accessToken);
        if (!actor) return denied();
        binding = { actorId: actor.actorId, sessionId: actor.sessionId, challengeId: randomUUID() };
        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const issued = await options.store.begin({ ...binding, codeHash: codeHash(binding, code), ipHash: mac(`ip:${trustedRequestIp}`) });
        if (!record(issued) || issued.state !== "issued") return denied(issued);
        if (issued.challengeId !== binding.challengeId || issued.recipient !== actor.email
          || typeof issued.expiresAt !== "string" || !Number.isFinite(Date.parse(issued.expiresAt))
          || Date.parse(issued.expiresAt) <= Date.now()) {
          await options.store.delivery({ ...binding, delivered: false });
          return { state: "unavailable" };
        }
        // Recipient comes only from trusted current managed records, never form input.
        const delivered = await options.deliver({ recipient: issued.recipient, language: "en",
          subject: "MSRC 2027 staff sign-in code",
          text: `Your MSRC 2027 staff sign-in code is ${code}. It expires in 5 minutes. Do not share this code. If you did not request it, contact your administrator.` });
        const confirmed = await options.store.delivery({ ...binding, delivered: delivered === true });
        if (delivered !== true || !record(confirmed) || confirmed.state !== "ok") {
          if (delivered === true) await options.store.delivery({ ...binding, delivered: false });
          return { state: "unavailable" };
        }
        return { state: "issued", challengeId: binding.challengeId, expiresAt: issued.expiresAt };
      } catch {
        if (binding) { try { await options.store.delivery({ ...binding, delivered: false }); } catch {
          // No challenge identifier is disclosed if the storage outcome is uncertain.
        } }
        return { state: "unavailable" };
      }
    },
    async verify(accessToken: string, challengeId: string, code: string): Promise<StaffEmailResult> {
      try {
        if (!uuid.test(challengeId) || typeof code !== "string" || !/^\d{6}$/.test(code)) return denied();
        const actor = await principal(accessToken);
        if (!actor) return denied();
        const binding = { actorId: actor.actorId, sessionId: actor.sessionId, challengeId };
        const result = await options.store.consume({ ...binding, codeHash: codeHash(binding, code) });
        return record(result) && result.state === "verified" ? { state: "verified" } : denied(result);
      } catch { return { state: "unavailable" }; }
    },
  });
}

/** No default email service, Supabase OTP sign-in, recovery or permission activation. */
export async function managedStaffEmailCheck() {
  return { state: "unavailable", ready: MANAGED_STAFF_EMAIL_READY } as const;
}
