import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createContentHandler } from "@/features/staff-portal/content-handler.server";
import { StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { contentPublishIssue, decodeContentFields, emptyContentFields } from "@/features/staff-portal/content-contract";

vi.mock("@/features/content/revalidate.server", () => ({ revalidatePublishedContent: vi.fn() }));
const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-23T06:00:00Z");
const actorId = "39000000-0000-4000-8000-000000000001", sessionId = "39000000-0000-4000-8000-000000000002", itemId = "39000000-0000-4000-8000-000000000003";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const fields = { ...emptyContentFields(), nameEn: "Synthetic speaker", nameAr: "متحدث تجريبي", titleEn: "Synthetic title", titleAr: "لقب تجريبي" };
const item = { id: itemId, collection: "speakers", version: 2, publishedVersion: null, draft: fields, updatedAt: new Date(now).toISOString() };
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>;
const revalidate = vi.fn();
function persisted() {
  const superAdmin = roles.includes("superAdmin");
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
    authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: policySatisfied,
    reason: policySatisfied ? null : superAdmin ? "mfa_required" : "staff_email_check_required",
    mfaValid: superAdmin && policySatisfied, passwordValid: true, staffEmailValid: !superAdmin && policySatisfied, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(),
      absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
function request(body?: Record<string, unknown>, query = "?collection=speakers", signedIn = true, extraHeaders: Record<string, string> = {}) {
  return new Request(origin + "/api/staff-portal/content" + query, { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3219",
    ...(signedIn ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}),
    ...(body ? { origin, "Content-Type": "application/json" } : {}), ...extraHeaders }, body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const handle = (input: Request) => createContentHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now, revalidate })(input);
const save = () => request({ action: "save", collection: "speakers", itemId: null, version: 0, fields });
const publish = (action = "publish") => request({ action, itemId, version: 1, confirmed: true });
beforeEach(() => {
  roles = ["contentMediaEditor"]; policySatisfied = true; revalidate.mockReset();
  replies = { msrc_staff_content_list: { state: "ready", items: [item] }, msrc_staff_content_save: { state: "updated", item },
    msrc_staff_content_transition: { state: "updated", item: { ...item, publishedVersion: 2 } }, msrc_staff_content_reorder: { state: "updated", items: [item] },
    msrc_staff_content_history: { state: "ready", history: [{ version: 1, action: "save", fields, createdAt: item.updatedAt }] } };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Editor", roles, session: persisted() };
    const result = replies[name]; if (result instanceof Error) throw result; return result ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});
describe("content server boundary", () => {
  it.each(ROLES)("independently authorizes reads and mutations for %s", async (role) => {
    roles = [role]; const allowed = ["contentMediaEditor", "superAdmin"].includes(role);
    expect((await handle(request())).status).toBe(allowed ? 200 : 403);
    expect((await handle(save())).status).toBe(allowed ? 200 : 403);
    if (!allowed) expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_content_"))).toBe(false);
  });
  it.each(["contentMediaEditor", "superAdmin"] as const)("denies insufficient session assurance for %s", async (role) => {
    roles = [role]; policySatisfied = false; expect((await handle(save())).status).toBe(403);
  });
  it("denies missing session and native identity mismatch", async () => {
    expect((await handle(request(undefined, "?collection=speakers", false))).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle(save())).status).toBe(403);
  });
  it("retains the closed gate before reading session or backend", async () => {
    const response = await createContentHandler({ readiness: () => ({ state: "closed" }), backend: () => backend })(save());
    expect(response.status).toBe(503); expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, missing token and unconfirmed publication", async () => {
    expect((await handle(request({ action: "save" }, "", true, { origin: "https://evil.invalid" }))).status).toBe(400);
    expect((await handle(request({ action: "save", formToken: "" }))).status).toBe(400);
    expect((await handle(request({ action: "publish", itemId, version: 1 }))).status).toBe(400); expect(revalidate).not.toHaveBeenCalled();
  });
  it("rejects missing/duplicate/unknown query fields", async () => {
    for (const query of ["", "?collection=unknown", "?collection=team&collection=speakers", "?collection=team&extra=x", "?itemId=bad"]) expect((await handle(request(undefined, query))).status).toBe(400);
  });
  it("reports missing migration without signing out and preserves refreshed cookies", async () => {
    replies.msrc_staff_content_list = new StaffRpcMissingError();
    const result = await handle(request()); expect((await result.json()).state).toBe("area-not-ready"); expect(result.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
    const expired = { ...native, accessToken: "header." + Buffer.from(JSON.stringify({ ...claims, exp: now / 1000 })).toString("base64url") + ".signature" };
    const cookie = staffCookie(config, { ...expired, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0];
    const rotated = await handle(request(undefined, "?collection=speakers", true, { cookie })); expect((await rotated.json()).state).toBe("area-not-ready"); expect(rotated.headers.get("set-cookie")).toContain("msrc-staff-test=");
  });
  it.each(["publish", "unpublish"])("revalidates after confirmed committed %s", async (action) => {
    const response = await handle(publish(action)); expect(response.status).toBe(200); expect(revalidate).toHaveBeenCalledExactlyOnceWith("speakers");
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_content_transition", { edition_key: config.editionKey, item_id: itemId, expected_version: 1, action, restore_version: null }, accessToken);
  });
  it.each(["conflict", "invalid", "referenced", "translation_required", "permission_required", "media_required", "denied"])("does not revalidate on database %s", async (state) => {
    replies.msrc_staff_content_transition = { state }; expect((await handle(publish())).ok).toBe(false); expect(revalidate).not.toHaveBeenCalled();
  });
  it("save and restore change drafts without cache invalidation", async () => {
    expect((await handle(save())).status).toBe(200);
    expect((await handle(request({ action: "restore", itemId, version: 2, restoreVersion: 1 }))).status).toBe(200);
    expect(revalidate).not.toHaveBeenCalled();
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_content_save", { edition_key: config.editionKey, collection_key: "speakers", item_id: null, expected_version: 0, fields }, accessToken);
  });
  it("distinguishes a referenced speaker from a stale version conflict", async () => {
    replies.msrc_staff_content_transition = { state: "referenced" };
    const response = await handle(publish("unpublish")); expect(response.status).toBe(409); expect((await response.json()).state).toBe("referenced");
  });
  it("does not repeat a committed mutation when cache invalidation fails", async () => {
    revalidate.mockImplementationOnce(() => { throw new Error("Cache unavailable"); });
    const response = await handle(publish()); expect(response.status).toBe(503); expect((await response.json()).state).toBe("unavailable");
    expect(vi.mocked(backend.rpc).mock.calls.filter(([name]) => name === "msrc_staff_content_transition")).toHaveLength(1);
    expect(backend.logout).not.toHaveBeenCalled();
  });
  it("rejects malformed transition output without invalidating unrelated routes", async () => {
    replies.msrc_staff_content_transition = { state: "updated", item: { ...item, collection: "private-records" } };
    expect((await handle(publish())).status).toBe(503); expect(revalidate).not.toHaveBeenCalled();
  });
  it("rejects duplicate reorder IDs and forwards every expected version", async () => {
    expect((await handle(request({ action: "reorder", collection: "speakers", items: [{ id: itemId, version: 1 }, { id: itemId, version: 2 }] }))).status).toBe(400);
    expect((await handle(request({ action: "reorder", collection: "speakers", items: [{ id: itemId, version: 2 }] }))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_content_reorder", { edition_key: config.editionKey, collection_key: "speakers", items: [{ id: itemId, version: 2 }] }, accessToken);
  });
  it("accepts bounded bilingual biographies larger than legacy 8 KiB forms", async () => {
    expect((await handle(request({ action: "save", collection: "speakers", itemId: null, version: 0, fields: { ...fields, bioEn: "a".repeat(6000), bioAr: "أ".repeat(6000) } }))).status).toBe(200);
    expect((await handle(request({ action: "save", extra: "a".repeat(131072) }))).status).toBe(400);
  });
  it("projects only allowlisted row and revision fields", async () => {
    replies.msrc_staff_content_list = { state: "ready", items: [{ ...item, actorEmail: "private@example.invalid" }] };
    const response = await handle(request()); const body = await response.json(); expect(body.items[0]).not.toHaveProperty("actorEmail"); expect(response.headers.get("cache-control")).toContain("no-store");
    replies.msrc_staff_content_history = { state: "ready", history: [{ version: 1, action: "create", fields, createdAt: item.updatedAt, secret: "private" }] };
    expect((await (await handle(request(undefined, "?itemId=" + itemId))).json()).history[0]).not.toHaveProperty("secret");
  });
  it("fails safely on malformed provider rows and outages", async () => {
    for (const result of [{ state: "ready", items: [{ ...item, draft: { ...fields, privateEmail: "x" } }] }, { state: "ready", items: [item, item] }, new Error("private diagnostic")]) {
      replies.msrc_staff_content_list = result; const response = await handle(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("diagnostic");
    }
  });
});
describe("content input contract", () => {
  it("normalizes case-insensitive UUID references for public speaker lookup", () => {
    const id = "a9000000-0000-4000-8000-000000000003";
    expect(decodeContentFields({ ...fields, speakerIds: [id.toUpperCase()], assetId: id.toUpperCase() })).toMatchObject({ speakerIds: [id], assetId: id });
    expect(decodeContentFields({ ...fields, speakerIds: [id, id.toUpperCase()] })).toBeNull();
  });
  it("allows incomplete drafts while enforcing bilingual publish fields", () => {
    expect(decodeContentFields(emptyContentFields())).not.toBeNull(); expect(contentPublishIssue("speakers", emptyContentFields())).toBe("translation-required");
    expect(contentPublishIssue("speakers", fields)).toBeNull(); expect(contentPublishIssue("speakers", { ...fields, bioEn: "Needs translation" })).toBe("translation-required");
  });
  it("requires sponsor permission and valid Riyadh schedule ordering", () => {
    expect(contentPublishIssue("partners", { ...fields, tier: "partner" })).toBe("permission-required");
    expect(contentPublishIssue("sessions", { ...fields, day: "2027-01-27", startTime: "12:00", endTime: "11:00", type: "talk" })).toBe("invalid");
  });
  it.each([{ url: "javascript:alert(1)" }, { links: ["https://user:password@example.invalid"] }, { speakerIds: [itemId, itemId] }, { day: "2027-02-30" }, { startTime: "24:00" }, { permissionToDisplay: "true" }, { sortOrder: -1 }, { privateEmail: "x" }])("rejects invalid fields %j", (change) => {
    expect(decodeContentFields({ ...fields, ...change })).toBeNull();
  });
});
