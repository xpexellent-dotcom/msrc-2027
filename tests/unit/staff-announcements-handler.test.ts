import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createAnnouncementHandler } from "@/features/announcements/staff-handler.server";
import { decodeAnnouncement, decodeAnnouncementFields } from "@/features/announcements/contracts";
import { announcementDeliveryReady, decodeAnnouncementDelivery } from "@/features/announcements/contracts";
import { announcementCopy } from "@/features/announcements/staff-copy";
import { StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-23T06:00:00Z");
const actorId = "39000000-0000-4000-8000-000000000001", sessionId = "39000000-0000-4000-8000-000000000002", id = "39000000-0000-4000-8000-000000000003", operationId = "39000000-0000-4000-8000-000000000004";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const fields = { subjectEn: "Synthetic announcement", subjectAr: "إعلان تجريبي", bodyEn: "First paragraph.\n\nSecond paragraph.", bodyAr: "الفقرة الأولى.\n\nالفقرة الثانية.", segments: ["verified_participants"] };
const announcement = { ...fields, id, editionKey: config.editionKey, state: "draft", version: 1, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), scheduledAt: null, sentAt: null, recipientCount: 0, sentCount: 0, failedCount: 0, lastError: null };
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>;
function persisted() { return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
  authenticationTier: "super_admin", sessionPolicySatisfied: policySatisfied, reason: policySatisfied ? null : "mfa_required", mfaValid: policySatisfied, passwordValid: true, staffEmailValid: false, emailVerified: true,
  timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(), absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false }; }
function request(body?: Record<string, unknown>, options: { signedIn?: boolean; headers?: Record<string, string>; query?: string } = {}) {
  return new Request(origin + "/api/staff-portal/announcements" + (options.query ?? ""), { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3219",
    ...(options.signedIn !== false ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}),
    ...(body ? { origin, "Content-Type": "application/json" } : {}), ...options.headers }, body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const handle = (input: Request) => createAnnouncementHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input);
const save = () => ({ action: "save", input: { ...fields, expectedVersion: 0 } });
const send = () => ({ action: "send", announcementId: id, version: 1, previewToken: "preview-token", operationId, scheduledAt: null, confirmed: true });
const testSend = () => ({ action: "test-send", announcementId: id, version: 1, operationId });
const approve = () => ({ action: "layout-approval", approved: true, operationId, confirmed: true });
const delivery = { state: "ready", layoutApproved: false, deliveryEnabled: false, dailyCap: 0, sweepsEnabled: false };
beforeEach(() => {
  roles = ["superAdmin"]; policySatisfied = true;
  replies = { msrc_staff_announcement_delivery_status: delivery, msrc_staff_announcement_layout_approval: { ...delivery, layoutApproved: true }, msrc_staff_announcement_test_send: { state: "queued", messageId: operationId }, msrc_staff_announcements_list: { state: "ready", announcements: [announcement], segments: ["verified_participants"] }, msrc_staff_announcement_save: { state: "updated", announcement },
    msrc_staff_announcement_preview: { state: "ready", preview: { previewToken: "preview-token", total: 3, segments: [{ segment: "verified_participants", count: 3 }], samples: ["a***@e***"] } },
    msrc_staff_announcement_send: { state: "updated", announcement: { ...announcement, state: "sending", recipientCount: 3 } }, msrc_staff_announcement_cancel: { state: "updated", announcement: { ...announcement, state: "cancelled" } } };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Admin", roles, session: persisted() };
    const result = replies[name]; if (result instanceof Error) throw result; return result ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});

describe("announcements server authority and transport", () => {
  it.each(ROLES)("only Super Admin may read, save, preview or send: %s", async (role) => {
    roles = [role]; const allowed = role === "superAdmin";
    for (const body of [undefined, save(), { action: "preview", announcementId: id, version: 1 }, send(), testSend(), approve()]) expect((await handle(request(body))).status).toBe(allowed ? 200 : 403);
    if (!allowed) expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_announcement"))).toBe(false);
  });
  it("denies an insufficient exact session, missing cookie and native identity mismatch", async () => {
    policySatisfied = false; expect((await handle(request(save()))).status).toBe(403);
    policySatisfied = true; expect((await handle(request(undefined, { signedIn: false }))).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle(request(send()))).status).toBe(403);
  });
  it("keeps the closed runtime gate ahead of all backend reads", async () => {
    expect((await createAnnouncementHandler({ readiness: () => ({ state: "closed" }), backend: () => backend })(request(save()))).status).toBe(503);
    expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests, missing token, unexpected query and oversized bodies", async () => {
    expect((await handle(request(save(), { headers: { origin: "https://evil.invalid" } }))).status).toBe(400);
    expect((await handle(request({ ...save(), formToken: "" }))).status).toBe(400);
    expect((await handle(request(undefined, { query: "?extra=1" }))).status).toBe(400);
    expect((await handle(request({ ...save(), extra: "a".repeat(131072) }))).status).toBe(400);
  });
  it("passes immutable version, preview token and operation id with the native bearer", async () => {
    expect((await handle(request(send()))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_announcement_send", { edition_key: config.editionKey, announcement_id: id, expected_version: 1, preview_token: "preview-token", operation_id: operationId, scheduled_at: null }, accessToken);
    expect((await handle(request(save()))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_announcement_save", { edition_key: config.editionKey, input: { ...fields, expectedVersion: 0 } }, accessToken);
  });
  it("requires explicit confirmation and a fresh future schedule", async () => {
    for (const input of [{ ...send(), confirmed: false }, { ...send(), previewToken: "" }, { ...send(), operationId: "bad" }, { ...send(), scheduledAt: "2026-10-22T00:00:00Z" }, { action: "cancel", announcementId: id, version: 1, operationId }]) expect((await handle(request(input))).status).toBe(400);
    expect((await handle(request({ ...send(), scheduledAt: "2026-10-24T00:00:00Z" }))).status).toBe(200);
  });
  it.each(["conflict", "denied", "invalid", "audience_changed", "not_due"])("preserves safe database failures: %s", async (state) => {
    replies.msrc_staff_announcement_send = { state }; const response = await handle(request(send())); expect(response.ok).toBe(false); expect(await response.text()).not.toContain("private"); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("shows an unapplied migration without signing out, including rotated cookie", async () => {
    replies.msrc_staff_announcements_list = new StaffRpcMissingError();
    const response = await handle(request()); expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready"); expect(backend.logout).not.toHaveBeenCalled();
    const expired = { ...native, accessToken: "header." + Buffer.from(JSON.stringify({ ...claims, exp: now / 1000 })).toString("base64url") + ".signature" };
    const cookie = staffCookie(config, { ...expired, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0];
    const rotated = await handle(request(undefined, { headers: { cookie } })); expect(rotated.headers.get("set-cookie")).toContain("msrc-staff-test=");
  });
  it("never projects unexpected fields or full recipient addresses", async () => {
    replies.msrc_staff_announcements_list = { state: "ready", announcements: [{ ...announcement, recipients: ["private@example.invalid"] }], segments: ["verified_participants"] };
    const response = await handle(request()); expect(await response.text()).not.toContain("private@example.invalid"); expect(response.headers.get("cache-control")).toContain("no-store");
    replies.msrc_staff_announcement_preview = { state: "ready", preview: { previewToken: "token", total: 1, segments: [], samples: ["private@example.invalid"] } };
    expect((await handle(request({ action: "preview", announcementId: id, version: 1 }))).status).toBe(503);
  });
  it("fails safely on duplicated rows, wrong edition, malformed counts or provider outages", async () => {
    for (const result of [{ state: "ready", announcements: [announcement, announcement], segments: [] }, { state: "ready", announcements: [{ ...announcement, editionKey: "another-edition" }], segments: [] }, { state: "updated", announcement: { ...announcement, recipientCount: -1 } }, new Error("private diagnostic")]) {
      replies.msrc_staff_announcements_list = result; const response = await handle(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("diagnostic");
    }
  });
  it("renders the bilingual preview through the shared renderer without claiming or enqueuing", async () => {
    const response = await handle(request({ action: "render", fields })); expect(response.status).toBe(200);
    const body = await response.json(); expect(body.rendered.html).toContain('dir="rtl"'); expect(body.rendered.subject).toBe(fields.subjectEn + " | " + fields.subjectAr);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => /enqueue|announcement_send|form_claim/.test(name))).toBe(false);
    roles = ["finance"]; expect((await handle(request({ action: "render", fields }))).status).toBe(403);
  });
  it("reports the database gates and server-only runtime status without reflecting private configuration", async () => {
    const response = await handle(request());
    expect((await response.json()).delivery).toEqual({ layoutApproved: false, deliveryEnabled: false, dailyCap: 0, sweepsEnabled: false, runtimeReady: false });
    replies.msrc_staff_announcement_delivery_status = { ...delivery, deliveryEnabled: true, dailyCap: 10, sweepsEnabled: true, secret: "private-key" };
    const ready = await createAnnouncementHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now, runtimeDeliveryReady: () => true })(request());
    const data = await ready.json(); expect(announcementDeliveryReady(data.delivery)).toBe(true); expect(JSON.stringify(data)).not.toContain("private-key");
  });
  it("enqueues a self-test with only the draft identity and stable operation, never a supplied recipient", async () => {
    for (let i = 0; i < 2; i++) expect((await handle(request(testSend()))).status).toBe(200);
    const calls = vi.mocked(backend.rpc).mock.calls.filter(([name]) => name === "msrc_staff_announcement_test_send");
    expect(calls).toHaveLength(2); expect(calls[0]).toEqual(calls[1]);
    expect(calls[0]).toEqual(["msrc_staff_announcement_test_send", { edition_key: config.editionKey, announcement_id: id, expected_version: 1, operation_id: operationId }, accessToken]);
    for (const change of [{ recipient: "someone@example.invalid" }, { fields }, { version: 0 }, { operationId: "bad" }]) expect((await handle(request({ ...testSend(), ...change }))).status).toBe(400);
  });
  it("requires explicit confirmation for layout approval and sends only approved boolean and operation ID", async () => {
    expect((await handle(request({ ...approve(), confirmed: false }))).status).toBe(400);
    expect((await handle(request({ ...approve(), approved: "true" }))).status).toBe(400);
    const response = await handle(request(approve())); expect(response.status).toBe(200); expect((await response.json()).delivery.layoutApproved).toBe(true);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_announcement_layout_approval", { edition_key: config.editionKey, approved: true, operation_id: operationId }, accessToken);
  });
  it.each(["msrc_staff_announcement_delivery_status", "msrc_staff_announcement_layout_approval", "msrc_staff_announcement_test_send"])("missing release RPC preserves staff sign-in: %s", async (name) => {
    replies[name] = new StaffRpcMissingError();
    const response = await handle(request(name.endsWith("delivery_status") ? undefined : name.endsWith("test_send") ? testSend() : approve()));
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready"); expect(backend.logout).not.toHaveBeenCalled();
  });
  it.each(["rate_limited", "conflict", "denied", "invalid"])("preserves safe test-send failure %s", async (state) => {
    replies.msrc_staff_announcement_test_send = { state };
    const response = await handle(request(testSend())); expect(response.status).toBe(state === "rate_limited" ? 429 : state === "denied" ? 403 : 409);
  });
  it("rejects malformed release status and queued test results", async () => {
    replies.msrc_staff_announcement_delivery_status = { ...delivery, layoutApproved: "true" }; expect((await handle(request())).status).toBe(503);
    replies.msrc_staff_announcement_test_send = { state: "queued", messageId: "private@example.invalid" }; const response = await handle(request(testSend())); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private@example.invalid");
  });
});

describe("announcement release UI copy and gates", () => {
  it.each(["en", "ar"] as const)("explains self-only tests, closed delivery and permanent old holds in %s", (locale) => {
    const text = announcementCopy[locale];
    for (const key of ["deliveryOff", "approvalHint", "testHint", "testQueuedOff", "held"] as const) expect(text[key].length).toBeGreaterThan(30);
    expect(text.deliveryOff).toContain(locale === "en" ? "No email will arrive" : "لن تصلك");
    expect(text.testHint).toContain(locale === "en" ? "own verified address" : "بريدك الموثّق فقط");
    expect(text.testQueuedOff).toContain(locale === "en" ? "Delivery is off" : "التوصيل معطّل");
    expect(text.held).toContain(locale === "en" ? "even after later approval" : "حتى بعد اعتماده لاحقًا");
    expect(text.approvalHint).toContain(locale === "en" ? "registration email approval is separate" : "اعتماد بريد التسجيل منفصل");
  });
  it("requires every global delivery gate independently of layout approval", () => {
    const open = { layoutApproved: false, deliveryEnabled: true, dailyCap: 1, sweepsEnabled: true, runtimeReady: true };
    expect(announcementDeliveryReady(open)).toBe(true);
    for (const change of [{ deliveryEnabled: false }, { dailyCap: 0 }, { sweepsEnabled: false }, { runtimeReady: false }]) expect(announcementDeliveryReady({ ...open, ...change })).toBe(false);
    expect(announcementDeliveryReady(undefined)).toBe(false);
    expect(decodeAnnouncementDelivery({ ...delivery, dailyCap: "1000" }, false)).toBeNull();
  });
});
describe("announcement shared contracts", () => {
  it.each([{ bodyEn: "<b>raw</b>" }, { bodyEn: "<!-- comment -->" }, { subjectAr: "حقن\nعنوان" }, { bodyAr: "أ".repeat(3501) }, { subjectEn: "x".repeat(91) }, { segments: ["unknown"] }, { segments: ["verified_participants", "verified_participants"] }, { segments: [] }, { privateField: "x" }])("rejects invalid authored content %j", (change) => expect(decodeAnnouncementFields({ ...fields, ...change })).toBeNull());
  it("preserves ordinary math, paragraphs and bounded bilingual bodies", () => {
    expect(decodeAnnouncementFields({ ...fields, bodyEn: "A < B\n\nC > D", bodyAr: "أ".repeat(3500) })).not.toBeNull();
    expect(decodeAnnouncement({ ...announcement, lastError: "author_no_longer_authorized" })).not.toBeNull();
  });
});
