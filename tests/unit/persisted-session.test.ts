import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { parsePersistedSessionContext, readVerifiedSessionContext } from "@/lib/supabase/session.server";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), config: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: mocks.config }));
const userId = "81000000-0000-4000-8000-000000000001";
const sessionId = "82000000-0000-4000-8000-000000000001";
const editionId = "synthetic-session-2027";
const started = Date.UTC(2026, 9, 2, 12);
function fixture() {
  return { schemaVersion: 1, editionId, principal: { userId, sessionId }, privileged: true,
    sessionPolicySatisfied: true, reason: null as string | null, mfaValid: true, passwordValid: true, emailVerified: true, phoneVerified: true,
    timing: { startedAt: new Date(started).toISOString(), lastActivityAt: new Date(started + 60_000).toISOString(),
      absoluteExpiresAt: new Date(started + 28_800_000).toISOString(),
      idleExpiresAt: new Date(started + 60_000 + 1_800_000).toISOString(),
      authenticatedAt: new Date(started + 30_000).toISOString() as string | null },
    policy: { ...SESSION_POLICY }, operationalAccessReady: false, privilegedAccessReady: false };
}
let client: { auth: { getUser: ReturnType<typeof vi.fn> }; rpc: ReturnType<typeof vi.fn> };
beforeEach(() => {
  mocks.config.mockReturnValue({ url: "http://127.0.0.1:54321", publishableKey: "sb_publishable_synthetic" });
  client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: fixture(), error: null }) };
  mocks.createClient.mockReturnValue(client);
});

describe("AUTH-05 exact own-session parser", () => {
  it("accepts minimized identity/timing with literal closed readiness", () => {
    expect(parsePersistedSessionContext(fixture(), userId, editionId)).toMatchObject({
      principal: { userId, sessionId }, sessionPolicySatisfied: true,
      timing: { startedAtMs: started }, operationalAccessReady: false, privilegedAccessReady: false });
  });
  it("accepts denial metadata without treating it as access", () => {
    const value = fixture(); value.sessionPolicySatisfied = false; value.reason = "session_revoked";
    expect(parsePersistedSessionContext(value, userId, editionId)?.reason).toBe("session_revoked");
  });
  it.each([
    { schemaVersion: 2 }, { editionId: "other" }, { principal: { userId: sessionId, sessionId } },
    { principal: { userId, sessionId: "bad" } }, { operationalAccessReady: true }, { privilegedAccessReady: true },
    { email: "private@example.invalid" }, { reason: "provider-secret-detail" }, { reason: "idle_expired" },
    { mfaValid: false }, { passwordValid: false }, { emailVerified: false }, { phoneVerified: "verified" }, { policy: { ...SESSION_POLICY, participantAbsoluteSeconds: 259201 } },
    { policy: { ...SESSION_POLICY, recentAuthMaxAgeSeconds: 1 } },
  ])("rejects untrusted altered result %j", (changed) => {
    expect(parsePersistedSessionContext({ ...fixture(), ...changed }, userId, editionId)).toBeNull();
  });
  it("accepts participant AAL1 policy metadata with both verifications and no MFA", () => {
    const value = fixture(); value.privileged = false; value.mfaValid = false;
    value.timing.absoluteExpiresAt = new Date(started + 259_200_000).toISOString();
    (value.timing as { idleExpiresAt: string | null }).idleExpiresAt = null;
    expect(parsePersistedSessionContext(value, userId, editionId)?.sessionPolicySatisfied).toBe(true);
    value.phoneVerified = false;
    expect(parsePersistedSessionContext(value, userId, editionId)).toBeNull();
    value.reason = "account_verification_required"; value.sessionPolicySatisfied = false;
    expect(parsePersistedSessionContext(value, userId, editionId)?.reason).toBe("account_verification_required");
  });
  it.each(["not-a-date", "2026-10-02", "2026-10-02T12:00:00"]) ("rejects malformed time %s", (startedAt) => {
    const value = fixture(); value.timing.startedAt = startedAt;
    expect(parsePersistedSessionContext(value, userId, editionId)).toBeNull();
  });
  it("rejects an extended absolute deadline despite valid timestamps", () => {
    const value = fixture(); value.timing.absoluteExpiresAt = new Date(started + 28_800_001).toISOString();
    expect(parsePersistedSessionContext(value, userId, editionId)).toBeNull();
  });
});

describe("AUTH-05 verified server observation and failure recovery", () => {
  it("verifies same bearer then reads self context, with no refresh or activity", async () => {
    const order: string[] = [];
    client.auth.getUser.mockImplementation(async () => { order.push("identity");
      return { data: { user: { id: userId } }, error: null }; });
    client.rpc.mockImplementation(async () => { order.push("context"); return { data: fixture(), error: null }; });
    expect((await readVerifiedSessionContext("synthetic-bearer", editionId)).state).toBe("verified");
    expect(order).toEqual(["identity", "context"]);
    expect(client.auth.getUser).toHaveBeenCalledWith("synthetic-bearer");
    expect(client.rpc).toHaveBeenCalledWith("msrc_session_context", { edition_key: editionId });
    expect(mocks.createClient.mock.calls.at(-1)?.[2]).toMatchObject({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: "Bearer synthetic-bearer" } } });
  });
  it.each(["", "contains whitespace", "x".repeat(16385)])("rejects malformed credentials without provider calls", async (token) => {
    expect(await readVerifiedSessionContext(token, editionId)).toEqual({ state: "denied" });
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });
  it("fails unavailable on missing configuration", async () => {
    mocks.config.mockReturnValue(null);
    expect(await readVerifiedSessionContext("synthetic", editionId)).toEqual({ state: "unavailable" });
  });
  it("rejects failed managed identity before calling RPC", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "private failure" } });
    expect(await readVerifiedSessionContext("synthetic", editionId)).toEqual({ state: "denied" });
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("sanitizes database failure and succeeds on retry", async () => {
    client.rpc.mockResolvedValueOnce({ data: null, error: { message: "private SQL" } });
    expect(await readVerifiedSessionContext("synthetic", editionId)).toEqual({ state: "unavailable" });
    expect((await readVerifiedSessionContext("synthetic", editionId)).state).toBe("verified");
  });
  it("fails unavailable on transport failure", async () => {
    client.rpc.mockRejectedValue(new Error("private network details"));
    expect(await readVerifiedSessionContext("synthetic", editionId)).toEqual({ state: "unavailable" });
  });
  it("denies malformed own context", async () => {
    client.rpc.mockResolvedValue({ data: { ...fixture(), privilegedAccessReady: true }, error: null });
    expect(await readVerifiedSessionContext("synthetic", editionId)).toEqual({ state: "denied" });
  });
});
