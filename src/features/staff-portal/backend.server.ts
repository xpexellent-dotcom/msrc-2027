import "server-only";
import { createClient, type Session } from "@supabase/supabase-js";
import { createStaffEmailCheck, type StaffEmailResult } from "@/features/auth/staff-email.server";
import { createSupabaseTotpContract, type TotpEnrollment } from "@/features/auth/mfa-provider.server";
import type { StaffConfig } from "./config.server";
import { deliverStaffMessage, staffInvitationEmail } from "./email.server";
import { nativeSessionId } from "./security.server";

export interface NativeStaffSession { actorId: string; sessionId: string; accessToken: string; refreshToken: string }
export interface StaffBackend {
  rpc(name: string, args?: Record<string, unknown>, accessToken?: string): Promise<unknown>;
  createUser(input: { actorId: string; reservationId: string; email: string; name: string; password: string }): Promise<boolean>;
  updateUser(actorId: string, password: string, confirmEmail?: boolean): Promise<boolean>;
  login(email: string, password: string): Promise<NativeStaffSession | null>;
  identity(accessToken: string): Promise<string | null>;
  refresh(refreshToken: string): Promise<NativeStaffSession | null>;
  logout(accessToken: string): Promise<boolean>;
  emailIssue(accessToken: string, ip: string): Promise<StaffEmailResult>;
  emailVerify(accessToken: string, challengeId: string, code: string): Promise<StaffEmailResult>;
  factors(session: NativeStaffSession): Promise<readonly string[] | null>;
  enroll(session: NativeStaffSession): Promise<TotpEnrollment | null>;
  challenge(session: NativeStaffSession, factorId: string): Promise<string | null>;
  verify(session: NativeStaffSession, factorId: string, challengeId: string, code: string): Promise<NativeStaffSession | null>;
  resetFactors(actorId: string, factorIds: readonly string[]): Promise<boolean>;
  invite(recipient: string, invitationId: string, token: string, origin: string): Promise<boolean>;
}
function native(session: Session | null): NativeStaffSession | null {
  const id = session && nativeSessionId(session.access_token);
  return session && id ? { actorId: session.user.id, sessionId: id, accessToken: session.access_token, refreshToken: session.refresh_token } : null;
}
export function createStaffBackend(config: StaffConfig): StaffBackend {
  const safeFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const auth = headers.get("authorization");
    if (auth === "Bearer " + config.secretKey || auth === "Bearer " + config.publishableKey) headers.delete("authorization");
    return fetch(input, { ...init, headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6_000) });
  };
  const client = (key: string) => createClient(config.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch },
  });
  const rpc: StaffBackend["rpc"] = async (name, args = {}, accessToken) => {
    if (!/^msrc_(staff_[a-z_]+|session_context|session_logout)$/.test(name)) throw new Error("Unknown private RPC");
    const headers = new Headers({ apikey: accessToken ? config.publishableKey : config.secretKey, "Content-Type": "application/json" });
    if (accessToken) headers.set("authorization", "Bearer " + accessToken);
    const response = await safeFetch(config.supabaseUrl + "/rest/v1/rpc/" + name, { method: "POST", headers, body: JSON.stringify(args) });
    if (!response.ok) { await response.body?.cancel(); throw new Error("Private staff RPC unavailable"); }
    return response.json();
  };
  const check = () => createStaffEmailCheck({ auth: client(config.publishableKey).auth, secret: config.securitySecret,
    store: { begin: (input) => rpc("msrc_staff_email_begin", { actor_id: input.actorId, session_id: input.sessionId,
      challenge_id: input.challengeId, code_hash: input.codeHash, ip_hash: input.ipHash }),
    delivery: (input) => rpc("msrc_staff_email_delivery", { actor_id: input.actorId, session_id: input.sessionId,
      challenge_id: input.challengeId, delivered: input.delivered }),
    consume: (input) => rpc("msrc_staff_email_consume", { actor_id: input.actorId, session_id: input.sessionId,
      challenge_id: input.challengeId, code_hash: input.codeHash }) },
    deliver: (message) => deliverStaffMessage(config, message.recipient, message.subject, message.text, crypto.randomUUID()) });
  async function bound(session: NativeStaffSession) {
    const sdk = client(config.publishableKey);
    const result = await sdk.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken });
    const observed = !result.error && native(result.data.session);
    return observed && observed.actorId === session.actorId && observed.sessionId === session.sessionId ? sdk : null;
  }
  return {
    rpc,
    async createUser(input) {
      if (config.testMode && !input.email.endsWith("@example.invalid")) return false;
      const response = await client(config.secretKey).auth.admin.createUser({ id: input.actorId, email: input.email,
        password: input.password, email_confirm: true, user_metadata: { name: input.name },
        app_metadata: { msrcStaffAdmission: input.reservationId } });
      return !response.error && response.data.user?.id === input.actorId;
    },
    async updateUser(actorId, password, confirmEmail = false) {
      const response = await client(config.secretKey).auth.admin.updateUserById(actorId, { password, ...(confirmEmail ? { email_confirm: true } : {}) });
      return !response.error && response.data.user?.id === actorId;
    },
    async login(email, password) {
      if (config.testMode && !email.endsWith("@example.invalid")) return null;
      const response = await client(config.publishableKey).auth.signInWithPassword({ email, password });
      return !response.error && response.data.user?.email_confirmed_at ? native(response.data.session) : null;
    },
    async identity(accessToken) {
      const response = await client(config.publishableKey).auth.getUser(accessToken);
      return !response.error && response.data.user?.email_confirmed_at ? response.data.user.id : null;
    },
    async refresh(refreshToken) {
      const response = await client(config.publishableKey).auth.refreshSession({ refresh_token: refreshToken });
      return !response.error && response.data.user?.email_confirmed_at ? native(response.data.session) : null;
    },
    async logout(accessToken) { const result = await client(config.publishableKey).auth.admin.signOut(accessToken, "local"); return !result.error; },
    emailIssue: (accessToken, ip) => check().issue(accessToken, ip),
    emailVerify: (accessToken, challengeId, code) => check().verify(accessToken, challengeId, code),
    async factors(session) {
      const sdk = await bound(session); if (!sdk) return null;
      const result = await sdk.auth.mfa.listFactors();
      return result.error ? null : result.data.totp.filter((factor) => factor.status === "verified").map((factor) => factor.id);
    },
    async enroll(session) {
      const sdk = await bound(session); if (!sdk) return null;
      const factors = await sdk.auth.mfa.listFactors();
      if (factors.error || factors.data.all.some((factor) => factor.status === "verified")) return null;
      // An interrupted enrollment has no retrievable secret. Only the authenticated
      // owner's unverified setup can be replaced; verified-factor recovery uses
      // the other Super Admin's separately reserved and audited reset operation.
      for (const factor of factors.data.all) {
        if (factor.factor_type !== "totp" || factor.status !== "unverified") return null;
        const cleared = await sdk.auth.mfa.unenroll({ factorId: factor.id }); if (cleared.error) return null;
      }
      const result = await createSupabaseTotpContract(sdk.auth).enroll(); return result.state === "ok" ? result.data : null;
    },
    async challenge(session, factorId) {
      const sdk = await bound(session); if (!sdk) return null;
      const result = await createSupabaseTotpContract(sdk.auth).challenge(factorId); return result.state === "ok" ? result.data.challengeId : null;
    },
    async verify(session, factorId, challengeId, code) {
      const sdk = await bound(session); if (!sdk) return null;
      const result = await createSupabaseTotpContract(sdk.auth).verify(factorId, challengeId, code);
      if (result.state !== "ok") return null;
      const current = await sdk.auth.getSession(); const observed = !current.error && native(current.data.session);
      return observed && observed.actorId === session.actorId && observed.sessionId === session.sessionId ? observed : null;
    },
    async resetFactors(actorId, factorIds) {
      const sdk = client(config.secretKey);
      const current = await sdk.auth.admin.mfa.listFactors({ userId: actorId });
      if (current.error || current.data.factors.some((factor) => !factorIds.includes(factor.id))) return false;
      for (const id of factorIds) {
        const result = await sdk.auth.admin.mfa.deleteFactor({ userId: actorId, id }); if (result.error) return false;
      }
      return true;
    },
    async invite(recipient, invitationId, token, origin) {
      if (!config.origins.includes(origin)) return false;
      const message = staffInvitationEmail(recipient, origin + "/en/staff/accept-invitation#invitation=" + invitationId + "&token=" + token);
      return deliverStaffMessage(config, recipient, message.subject, message.text, "invite/" + invitationId);
    },
  };
}
