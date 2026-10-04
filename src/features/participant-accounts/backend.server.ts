import "server-only";
import { createClient, type Session } from "@supabase/supabase-js";
import type { ParticipantConfig } from "./config.server";
import { deliverParticipantCode, type ParticipantCodePurpose } from "./email.server";
import { nativeSessionId } from "./security.server";

export interface NativeParticipantSession { actorId: string; sessionId: string; accessToken: string; refreshToken: string }
export interface ParticipantBackend {
  rpc(name: string, args?: Record<string, unknown>, accessToken?: string): Promise<unknown>;
  createUser(input: { actorId: string; reservationId: string; email: string; name: string; password: string }): Promise<boolean>;
  updateUser(actorId: string, password: string, confirmEmail: boolean): Promise<boolean>;
  login(email: string, password: string): Promise<NativeParticipantSession | null>;
  identity(accessToken: string): Promise<string | null>;
  refresh(refreshToken: string): Promise<NativeParticipantSession | null>;
  logout(accessToken: string): Promise<boolean>;
  deliver(recipient: string, code: string, purpose: ParticipantCodePurpose, challengeId: string): Promise<boolean>;
}
function native(session: Session | null): NativeParticipantSession | null {
  const id = session && nativeSessionId(session.access_token);
  return session && id ? { actorId: session.user.id, sessionId: id, accessToken: session.access_token, refreshToken: session.refresh_token } : null;
}
export function createParticipantBackend(config: ParticipantConfig): ParticipantBackend {
  const safeFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const auth = headers.get("authorization");
    // Modern API keys identify a service on apikey; only genuine user JWTs are bearer tokens.
    if (auth === "Bearer " + config.secretKey || auth === "Bearer " + config.publishableKey) headers.delete("authorization");
    return fetch(input, { ...init, headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6_000) });
  };
  const client = (key: string) => createClient(config.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch },
  });
  return {
    async rpc(name, args = {}, accessToken) {
      if (!/^msrc_(participant_[a-z_]+|session_context|session_logout)$/.test(name)) throw new Error("Unknown private RPC");
      const headers = new Headers({ apikey: accessToken ? config.publishableKey : config.secretKey, "Content-Type": "application/json" });
      if (accessToken) headers.set("authorization", "Bearer " + accessToken);
      const response = await safeFetch(config.supabaseUrl + "/rest/v1/rpc/" + name, { method: "POST", headers, body: JSON.stringify(args) });
      if (!response.ok) { await response.body?.cancel(); throw new Error("Private participant RPC unavailable"); }
      return response.json();
    },
    async createUser(input) {
      if (config.testMode && !input.email.endsWith("@example.invalid")) return false;
      const response = await client(config.secretKey).auth.admin.createUser({ id: input.actorId, email: input.email,
        password: input.password, email_confirm: false, user_metadata: { name: input.name },
        app_metadata: { msrcParticipantAdmission: input.reservationId } });
      return !response.error && response.data.user?.id === input.actorId;
    },
    async updateUser(actorId, password, confirmEmail) {
      const response = await client(config.secretKey).auth.admin.updateUserById(actorId,
        { password, ...(confirmEmail ? { email_confirm: true } : {}) });
      return !response.error && response.data.user?.id === actorId;
    },
    async login(email, password) {
      const response = await client(config.publishableKey).auth.signInWithPassword({ email, password });
      if (response.error || !response.data.user?.email_confirmed_at) return null;
      return native(response.data.session);
    },
    async identity(accessToken) {
      const response = await client(config.publishableKey).auth.getUser(accessToken);
      return !response.error && response.data.user?.email_confirmed_at ? response.data.user.id : null;
    },
    async refresh(refreshToken) {
      const response = await client(config.publishableKey).auth.refreshSession({ refresh_token: refreshToken });
      return !response.error && response.data.user?.email_confirmed_at ? native(response.data.session) : null;
    },
    async logout(accessToken) {
      const response = await client(config.publishableKey).auth.admin.signOut(accessToken, "local");
      return !response.error;
    },
    deliver: (recipient, code, purpose, challengeId) => deliverParticipantCode(config, recipient, code, purpose, challengeId),
  };
}
