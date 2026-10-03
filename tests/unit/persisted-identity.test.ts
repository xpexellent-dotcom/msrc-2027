import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readVerifiedAccessContext } from "@/lib/supabase/identity.server";
import { parsePersistedAccessContext } from "@/lib/permissions/persisted-context";
import { WORKFLOWS } from "@/config/workflows";
import { workflowFlags } from "@/lib/workflows.server";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getConfig: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: mocks.getConfig }));

const actorId = "10000000-0000-4000-8000-000000000001";
const otherActorId = "10000000-0000-4000-8000-000000000002";
const sessionId = "20000000-0000-4000-8000-000000000001";
const otherSessionId = "20000000-0000-4000-8000-000000000002";
const editionId = "synthetic-edition-a";
const token = "synthetic-opaque-bearer-a";
const config = { target: "local", url: "http://127.0.0.1:54321", publishableKey: "sb_publishable_synthetic_test_key" };

function contextFixture() {
  return {
    schemaVersion: 1, editionId,
    principal: { userId: actorId, sessionId },
    actor: {
      id: actorId, state: "active", emailVerified: true, phoneVerified: true, individuallyIdentified: true,
      session: { id: sessionId, active: false, assurance: "aal1", factor: null as "sms" | null, passwordVerified: true,
        authenticationTier: "staff" as "participant" | "staff" | "super_admin", staffEmailVerified: true },
    },
    grants: [{
      actorId, editionId, role: "finance", state: "active",
      scope: { kind: "function", functionId: "synthetic-finance-duty" },
    }],
    operationalAccessReady: false, privilegedAccessReady: false,
  };
}

function setPath(path: readonly string[], value: unknown): unknown {
  const input = contextFixture();
  let target = input as unknown as Record<string, unknown>;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[path[path.length - 1]] = value;
  return input;
}

function newClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: actorId } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: contextFixture(), error: null }),
  };
}
let client: ReturnType<typeof newClient>;

beforeEach(() => {
  mocks.createClient.mockReset();
  mocks.getConfig.mockReset();
  mocks.getConfig.mockReturnValue(config);
  client = newClient();
  mocks.createClient.mockReturnValue(client);
});

afterEach(() => vi.unstubAllGlobals());

describe("verified bearer to persisted own-context boundary (SEC-01/02, ROL-12)", () => {
  it("verifies identity before loading own edition context using exactly the same bearer", async () => {
    const callOrder: string[] = [];
    client.auth.getUser.mockImplementation(async () => {
      callOrder.push("identity");
      return { data: { user: { id: actorId } }, error: null };
    });
    client.rpc.mockImplementation(async () => {
      callOrder.push("context");
      return { data: contextFixture(), error: null };
    });
    const result = await readVerifiedAccessContext(token, editionId);
    expect(result).toEqual({ state: "verified", context: contextFixture() });
    expect(callOrder).toEqual(["identity", "context"]);
    expect(client.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("msrc_access_context", { edition_key: editionId });
    expect(mocks.createClient).toHaveBeenCalledExactlyOnceWith(config.url, config.publishableKey, expect.objectContaining({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: expect.any(Function) },
    }));
  });

  it("does not substitute a privileged environment key and forces no-store on network requests", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_synthetic_do_not_use");
    const network = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", network);
    await readVerifiedAccessContext(token, editionId);
    expect(mocks.createClient.mock.calls[0][1]).toBe(config.publishableKey);
    const options = mocks.createClient.mock.calls[0][2] as {
      global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
    };
    await options.global.fetch(`${config.url}/rest/v1/rpc/msrc_access_context`, { cache: "force-cache" });
    expect(network).toHaveBeenCalledExactlyOnceWith(`${config.url}/rest/v1/rpc/msrc_access_context`, { cache: "no-store" });
  });

  it.each(["", " ", "Bearer token", "opaque\ntoken", "a".repeat(16385), undefined, null, 42])("denies malformed bearer %j before configuration or SDK work", async (value) => {
    expect(await readVerifiedAccessContext(value as string, editionId)).toEqual({ state: "denied" });
    expect(mocks.getConfig).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each(["", " ", " padded", "padded ", "a".repeat(129), undefined, null, 42])("denies malformed edition %j before configuration or SDK work", async (value) => {
    expect(await readVerifiedAccessContext(token, value as string)).toEqual({ state: "denied" });
    expect(mocks.getConfig).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reports absent configuration generically without creating an SDK client", async () => {
    mocks.getConfig.mockReturnValue(null);
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "unavailable" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reports invalid configuration generically without echoing environment values", async () => {
    mocks.getConfig.mockImplementation(() => { throw new Error("invalid config: sb_secret_synthetic_do_not_print"); });
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "unavailable" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: actorId } }, error: { message: "secret identity error" } },
  ])("denies unknown or rejected identity without attempting a context RPC", async (response) => {
    client.auth.getUser.mockResolvedValue(response);
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "denied" });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("does not accept a context associated with another verified user", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: otherActorId } }, error: null });
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "denied" });
  });

  it("does not elevate identity using user-editable or cached metadata role names", async () => {
    const metadata = { role: "superAdmin", roles: ["superAdmin"], assurance: "aal2", individuallyIdentified: true,
      authenticationTier: "super_admin", staffEmailVerified: true };
    client.auth.getUser.mockResolvedValue({ data: { user: { id: actorId, user_metadata: metadata, app_metadata: metadata } }, error: null });
    const current = { ...contextFixture(), grants: [] };
    client.rpc.mockResolvedValue({ data: current, error: null });
    const result = await readVerifiedAccessContext(token, editionId);
    expect(result).toEqual({ state: "verified", context: current });
    expect(JSON.stringify(result)).not.toContain("superAdmin");
    expect(JSON.stringify(result)).not.toContain("metadata");
  });

  it.each([null, {}, [], setPath(["principal", "sessionId"], otherSessionId)])("denies absent/malformed/mismatched-session context %j", async (data) => {
    client.rpc.mockResolvedValue({ data, error: null });
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "denied" });
  });

  it("reports an RPC failure generically even if the database includes sensitive details", async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: "password=synthetic-secret; confidential/path; bearer=private" } });
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "unavailable" });
  });

  it.each(["factory", "identity", "rpc"] as const)("fails closed without logging credentials when %s throws", async (failure) => {
    const sensitive = `${token} password=synthetic-secret`;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    if (failure === "factory") mocks.createClient.mockImplementation(() => { throw new Error(sensitive); });
    if (failure === "identity") client.auth.getUser.mockRejectedValue(new Error(sensitive));
    if (failure === "rpc") client.rpc.mockRejectedValue(new Error(sensitive));
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "unavailable" });
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    if (failure !== "rpc") expect(client.rpc).not.toHaveBeenCalled();
  });

  it("creates separate clients and re-verifies identity plus grant state for every request", async () => {
    const first = newClient();
    const second = newClient();
    const revoked = { ...contextFixture(), grants: [] };
    second.rpc.mockResolvedValue({ data: revoked, error: null });
    mocks.createClient.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const firstResult = await readVerifiedAccessContext(token, editionId);
    const secondResult = await readVerifiedAccessContext(token, editionId);
    expect(firstResult).toEqual({ state: "verified", context: contextFixture() });
    expect(secondResult).toEqual({ state: "verified", context: revoked });
    expect(mocks.createClient).toHaveBeenCalledTimes(2);
    expect(first.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(second.auth.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(first.rpc).toHaveBeenCalledOnce();
    expect(second.rpc).toHaveBeenCalledOnce();
  });

  it("does not reuse context after the same bearer loses its database session", async () => {
    client.rpc.mockResolvedValueOnce({ data: contextFixture(), error: null }).mockResolvedValueOnce({ data: null, error: null });
    expect((await readVerifiedAccessContext(token, editionId)).state).toBe("verified");
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "denied" });
    expect(client.auth.getUser).toHaveBeenCalledTimes(2);
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  it("denies the same bearer after suspension revokes the persisted context", async () => {
    client.rpc.mockResolvedValueOnce({ data: contextFixture(), error: null }).mockResolvedValueOnce({ data: null, error: null });
    expect((await readVerifiedAccessContext(token, editionId)).state).toBe("verified");
    expect(await readVerifiedAccessContext(token, editionId)).toEqual({ state: "denied" });
  });
});

describe("persisted metadata parser rejects authority confusion and malformed schema", () => {
  const validScopes = [
    { kind: "edition" },
    { kind: "track", track: "research", trackId: "synthetic-research-track" },
    { kind: "track", track: "hackathon", trackId: "synthetic-hackathon-track" },
    { kind: "track", track: "threeMinuteThesis", trackId: "synthetic-three-minute-track" },
    { kind: "assignment", assignmentId: "synthetic-assignment" },
    { kind: "function", functionId: "synthetic-duty" },
    { kind: "resource", resourceId: "synthetic-resource" },
  ];

  it.each(validScopes)("accepts a structurally bounded scope %j without treating it as operational permission", (scope) => {
    const input = setPath(["grants", "0", "scope"], scope);
    const result = parsePersistedAccessContext(input, actorId, editionId);
    expect(result).not.toBeNull();
    expect(result?.grants[0].scope).toEqual(scope);
    expect(result?.actor.session.active).toBe(false);
    expect(result?.operationalAccessReady).toBe(false);
    expect(result?.privilegedAccessReady).toBe(false);
  });

  it.each([
    "participant", "abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer",
    "scientificAdministrator", "judgingCommittee", "facultyJudge", "registrationWorkshopAdministrator",
    "finance", "checkInStaff", "contentMediaEditor", "sponsorshipPr", "superAdmin",
  ])("accepts own current %s grant as metadata only", (role) => {
    const input = contextFixture(); input.grants[0].role = role;
    input.actor.session.authenticationTier = role === "superAdmin" ? "super_admin" : role === "participant" ? "participant" : "staff";
    input.actor.session.staffEmailVerified = input.actor.session.authenticationTier === "staff";
    const parsed = parsePersistedAccessContext(input, actorId, editionId);
    expect(parsed?.grants[0].role).toBe(role);
    expect(parsed?.actor.session.active).toBe(false);
  });

  it.each([
    { path: ["schemaVersion"], value: 2 },
    { path: ["editionId"], value: "synthetic-edition-b" },
    { path: ["principal", "userId"], value: otherActorId },
    { path: ["principal", "sessionId"], value: "not-a-session-uuid" },
    { path: ["actor", "id"], value: otherActorId },
    { path: ["actor", "state"], value: "approved" },
    { path: ["actor", "emailVerified"], value: false },
    { path: ["actor", "phoneVerified"], value: "verified" },
    { path: ["actor", "session", "passwordVerified"], value: false },
    { path: ["actor", "individuallyIdentified"], value: "true" },
    { path: ["actor", "session", "id"], value: otherSessionId },
    { path: ["actor", "session", "active"], value: true },
    { path: ["actor", "session", "assurance"], value: "aal3" },
    { path: ["actor", "session", "factor"], value: "totp" },
    { path: ["actor", "session", "factor"], value: "sms" },
    { path: ["actor", "session", "assurance"], value: "aal2" },
    { path: ["actor", "session", "authenticationTier"], value: undefined },
    { path: ["actor", "session", "authenticationTier"], value: "administrator" },
    { path: ["actor", "session", "authenticationTier"], value: ["staff"] },
    { path: ["actor", "session", "authenticationTier"], value: "participant" },
    { path: ["actor", "session", "staffEmailVerified"], value: undefined },
    { path: ["actor", "session", "staffEmailVerified"], value: "true" },
    { path: ["grants"], value: null },
    { path: ["grants", "0", "actorId"], value: otherActorId },
    { path: ["grants", "0", "editionId"], value: "synthetic-edition-b" },
    { path: ["grants", "0", "state"], value: "revoked" },
    { path: ["grants", "0", "role"], value: "__proto__" },
    { path: ["grants", "0", "role"], value: "administrator" },
    { path: ["operationalAccessReady"], value: true },
    { path: ["privilegedAccessReady"], value: true },
    { path: ["user_metadata"], value: { role: "superAdmin" } },
    { path: ["resource"], value: { approved: true } },
    { path: ["principal", "metadata"], value: { assurance: "aal2" } },
    { path: ["actor", "metadata"], value: { individuallyIdentified: true } },
    { path: ["actor", "session", "bearer"], value: "synthetic-private-token" },
    { path: ["grants", "0", "override"], value: true },
  ])("rejects malformed or surplus context field $path=$value", ({ path, value }) => {
    expect(parsePersistedAccessContext(setPath(path, value), actorId, editionId)).toBeNull();
  });

  it.each([
    null, [], {}, { kind: "superAdmin" }, { kind: "edition", override: true },
    { kind: "track", track: "unknown", trackId: "synthetic-track" },
    { kind: "track", track: "research", trackId: "" },
    { kind: "track", track: "research", trackId: " padded" },
    { kind: "assignment", assignmentId: null },
    { kind: "assignment", assignmentId: "" },
    { kind: "function", functionId: "" },
    { kind: "function", functionId: "synthetic-duty", role: "superAdmin" },
    { kind: "resource", resourceId: " " },
  ])("rejects malformed or surplus scope fields %j", (scope) => {
    expect(parsePersistedAccessContext(setPath(["grants", "0", "scope"], scope), actorId, editionId)).toBeNull();
  });

  it("does not coerce array/string-like objects into valid state, assurance or track enums", () => {
    const suspended = contextFixture();
    const badActor = { ...suspended, actor: { ...suspended.actor, state: ["active"] }, grants: [] };
    expect(parsePersistedAccessContext(badActor, actorId, editionId)).toBeNull();
    const assurance = { ...suspended, actor: { ...suspended.actor, session: { ...suspended.actor.session, assurance: ["aal1"], factor: null } } };
    expect(parsePersistedAccessContext(assurance, actorId, editionId)).toBeNull();
    const track = setPath(["grants", "0", "scope"], { kind: "track", track: ["research"], trackId: "synthetic-track" });
    expect(parsePersistedAccessContext(track, actorId, editionId)).toBeNull();
  });

  it("accepts observed AAL1 without marking its session active or privileged", () => {
    const input = contextFixture();
    input.actor.session.assurance = "aal1";
    input.actor.session.factor = null;
    const parsed = parsePersistedAccessContext(input, actorId, editionId);
    expect(parsed?.actor.session).toEqual({ id: sessionId, active: false, assurance: "aal1", factor: null,
      passwordVerified: true, authenticationTier: "staff", staffEmailVerified: true });
    expect(parsed?.privilegedAccessReady).toBe(false);
  });

  it("can observe a missing staff email check without marking its session active", () => {
    const input = contextFixture(); input.actor.session.staffEmailVerified = false;
    expect(parsePersistedAccessContext(input, actorId, editionId)?.actor.session).toMatchObject({
      authenticationTier: "staff", staffEmailVerified: false, active: false });
  });

  it("retains the strongest tier from other editions without granting unrelated authority", () => {
    const input = contextFixture(); input.actor.session.authenticationTier = "super_admin";
    input.actor.session.staffEmailVerified = false;
    const result = parsePersistedAccessContext(input, actorId, editionId);
    expect(result?.actor.session.authenticationTier).toBe("super_admin");
    expect(result?.grants.map((grant) => grant.role)).toEqual(["finance"]);
    expect(result?.actor.session.active).toBe(false);
  });

  it("rejects a Super Admin grant projected with the weaker staff tier", () => {
    const input = contextFixture(); input.grants[0].role = "superAdmin";
    expect(parsePersistedAccessContext(input, actorId, editionId)).toBeNull();
  });

  it.each(["participant", "super_admin"] as const)("rejects email-check proof attributed to the %s tier", (authenticationTier) => {
    const input = contextFixture(); input.actor.session.authenticationTier = authenticationTier;
    input.grants = [];
    expect(parsePersistedAccessContext(input, actorId, editionId)).toBeNull();
  });

  it.each(["authenticationTier", "staffEmailVerified"] as const)("requires the exact new session field %s", (field) => {
    const input = contextFixture(); delete (input.actor.session as Record<string, unknown>)[field];
    expect(parsePersistedAccessContext(input, actorId, editionId)).toBeNull();
  });

  it("rejects suspended access that still carries a grant", () => {
    expect(parsePersistedAccessContext(setPath(["actor", "state"], "suspended"), actorId, editionId)).toBeNull();
  });

  it("rejects an excessive result rather than silently dropping grants", () => {
    const input = contextFixture();
    input.grants = Array.from({ length: 1001 }, () => ({ ...input.grants[0] }));
    expect(parsePersistedAccessContext(input, actorId, editionId)).toBeNull();
  });

  it("requires an exact schema including readiness barriers", () => {
    const input = contextFixture() as unknown as Record<string, unknown>;
    delete input.privilegedAccessReady;
    expect(parsePersistedAccessContext(input, actorId, editionId)).toBeNull();
    expect(parsePersistedAccessContext(contextFixture(), "not-a-user-uuid", editionId)).toBeNull();
    expect(parsePersistedAccessContext(contextFixture(), actorId, "other-edition")).toBeNull();
  });

  it("freezes a detached context snapshot so callers and input mutation cannot expand access", () => {
    const input = contextFixture();
    const result = parsePersistedAccessContext(input, actorId, editionId)!;
    expect(result).not.toBeNull();
    for (const item of [result, result.principal, result.actor, result.actor.session, result.grants, result.grants[0], result.grants[0].scope]) {
      expect(Object.isFrozen(item)).toBe(true);
    }
    input.grants[0].role = "superAdmin";
    input.grants[0].scope.functionId = "synthetic-another-duty";
    input.actor.individuallyIdentified = false;
    expect(result.grants[0].role).toBe("finance");
    expect(result.grants[0].scope).toEqual({ kind: "function", functionId: "synthetic-finance-duty" });
    expect(result.actor.individuallyIdentified).toBe(true);
    expect(Reflect.set(result.actor.session, "active", true)).toBe(false);
  });

  it("does not enable operational workflows when persisted Super Admin metadata is verified", async () => {
    const input = contextFixture(); input.grants[0].role = "superAdmin";
    input.actor.session.authenticationTier = "super_admin"; input.actor.session.staffEmailVerified = false;
    input.actor.session.assurance = "aal2"; input.actor.session.factor = "sms";
    client.rpc.mockResolvedValue({ data: input, error: null });
    const result = await readVerifiedAccessContext(token, editionId);
    expect(result.state).toBe("verified");
    expect(Object.keys(workflowFlags).sort()).toEqual([...WORKFLOWS].sort());
    expect(Object.values(workflowFlags)).toEqual(Array(15).fill(false));
    if (result.state === "verified") {
      expect(result.context.actor.session.active).toBe(false);
      expect(result.context.operationalAccessReady).toBe(false);
      expect(result.context.privilegedAccessReady).toBe(false);
    }
  });
});
