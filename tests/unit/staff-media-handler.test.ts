import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createMediaHandler } from "@/features/staff-portal/media-handler.server";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { MEDIA_PRIVATE_BUCKET, MEDIA_PUBLIC_BUCKET, type MediaStorage } from "@/features/staff-portal/media-storage.server";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-23T06:00:00Z");
const actorId = "39000000-0000-4000-8000-000000000001", sessionId = "39000000-0000-4000-8000-000000000002";
const assetId = "39000000-0000-4000-8000-000000000003", operationId = "39000000-0000-4000-8000-000000000004";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const storagePath = `${config.editionKey}/${assetId}/image.webp`, rawPath = `${config.editionKey}/${assetId}/raw`;
const publicPath = `${config.editionKey}/${assetId}/${operationId}/image.webp`;
const fields = { altEn: "Synthetic image", altAr: "صورة تجريبية", captionEn: "", captionAr: "", creditEn: "", creditAr: "", focalX: 50, focalY: 50, rightsConfirmed: true, rightsEvidence: "Synthetic permission record" };
const asset = { id: assetId, fileName: "synthetic.png", storagePath, publicPath: null, mime: "image/webp", size: 128, width: 48, height: 32,
  ...fields, state: "draft", version: 1, busy: false, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, storage: MediaStorage, replies: Record<string, unknown>;
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
function request(body?: Record<string, unknown>, query = "", signedIn = true, extraHeaders: Record<string, string> = {}) {
  return new Request(origin + "/api/staff-portal/media" + query, { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3219",
    ...(signedIn ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000,
      challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}),
    ...(body ? { origin, "Content-Type": "application/json" } : {}), ...extraHeaders },
    body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const handle = (input: Request) => createMediaHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, storage: () => storage, now: () => now })(input);
const sign = () => request({ action: "upload-url", filename: "synthetic.png", size: 100 });
const transition = (action = "publish") => request({ action, assetId, version: 1, operationId });
beforeEach(async () => {
  roles = ["contentMediaEditor"]; policySatisfied = true;
  replies = {
    msrc_staff_media_list: { state: "ready", assets: [asset], total: 1 }, msrc_staff_media_get: { state: "ready", asset },
    msrc_staff_media_upload_reserve: { state: "reserved", uploadId: assetId, storagePath: rawPath, expiresAt: new Date(now + 900000).toISOString() },
    msrc_staff_media_upload_claim: { state: "reserved", uploadId: assetId, storagePath: rawPath, sanitizedPath: storagePath },
    msrc_staff_media_upload_complete: { state: "created", asset }, msrc_staff_media_upload_reject: { state: "rejected" },
    msrc_staff_media_update: { state: "updated", asset: { ...asset, version: 2 } },
    msrc_staff_media_transition_begin: { state: "reserved", operationId, asset, publicPath },
    msrc_staff_media_transition_finish: { state: "updated", asset: { ...asset, state: "published", publicPath, version: 2 } },
  };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Editor", roles, session: persisted() };
    const result = replies[name]; if (result instanceof Error) throw result; return result ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
  const bytes = await sharp({ create: { width: 48, height: 32, channels: 3, background: "purple" } }).png().toBuffer();
  storage = { signUpload: vi.fn(async () => "http://127.0.0.1:3220/storage/v1/object/upload/sign/msrc-media-drafts/raw?token=synthetic"),
    read: vi.fn(async () => bytes), write: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
});
describe("staff media authorization and mutations", () => {
  it.each(["upload_complete", "upload_reject", "transition_finish"])("rejects user bearer transport for service-only %s", async (operation) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    try { await expect(createStaffBackend(config).rpc("msrc_staff_media_" + operation, {}, accessToken)).rejects.toThrow("Invalid private RPC transport"); expect(fetch).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
  it.each(ROLES)("authorizes signed uploads and private reads independently for %s", async (role) => {
    roles = [role]; const allowed = ["contentMediaEditor", "superAdmin"].includes(role);
    expect((await handle(sign())).status).toBe(allowed ? 200 : 403);
    expect((await handle(request())).status).toBe(allowed ? 200 : 403);
    if (!allowed) { expect(storage.signUpload).not.toHaveBeenCalled(); expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name.startsWith("msrc_staff_media_"))).toBe(false); }
  });
  it.each(["contentMediaEditor", "superAdmin"] as const)("denies absent session assurance for %s", async (role) => {
    roles = [role]; policySatisfied = false; expect((await handle(sign())).status).toBe(403); expect(storage.signUpload).not.toHaveBeenCalled();
  });
  it("denies anonymous and native identity mismatch", async () => {
    expect((await handle(request({ action: "upload-url", filename: "x", size: 1 }, "", false))).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(null); expect((await handle(sign())).status).toBe(403); expect(storage.signUpload).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and absent CSRF tokens", async () => {
    expect((await handle(request({ action: "upload-url", filename: "x", size: 1 }, "", true, { origin: "https://evil.invalid" }))).status).toBe(400);
    expect((await handle(request({ action: "upload-url", filename: "x", size: 1, formToken: "" }))).status).toBe(400);
    expect(storage.signUpload).not.toHaveBeenCalled();
  });
  it("rejects unsafe paths, untrusted extra metadata and oversized declarations", async () => {
    for (const body of [{ filename: "../x", size: 1 }, { filename: "x", size: 10485761 }, { filename: "x", size: 1, mime: "image/png" }]) expect((await handle(request({ action: "upload-url", ...body }))).status).toBe(400);
    replies.msrc_staff_media_upload_reserve = { state: "reserved", uploadId: assetId, storagePath: "other-edition/raw" };
    expect((await handle(sign())).status).toBe(503); expect(storage.signUpload).not.toHaveBeenCalled();
  });
  it("returns area-not-ready without clearing valid sessions when migration is absent", async () => {
    replies.msrc_staff_media_upload_reserve = new StaffRpcMissingError(); const response = await handle(sign());
    expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready");
    expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("retains rotated cookies even when optional RPC is missing", async () => {
    const expired = { ...native, accessToken: "header." + Buffer.from(JSON.stringify({ ...claims, exp: now / 1000 })).toString("base64url") + ".signature" };
    const cookie = staffCookie(config, { ...expired, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0];
    replies.msrc_staff_media_list = new StaffRpcMissingError(); const response = await handle(request(undefined, "", true, { cookie }));
    expect((await response.json()).state).toBe("area-not-ready"); expect(response.headers.get("set-cookie")).toContain("msrc-staff-test=");
  });
  it("does not expose storage paths, uploader or digest in staff list projections", async () => {
    const response = await handle(request()); const value = await response.json();
    expect(value.assets[0].previewUrl).toBe(`/api/staff-portal/media?preview=${assetId}`);
    expect(value.assets[0]).not.toHaveProperty("storagePath"); expect(value.assets[0]).not.toHaveProperty("sha256");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("processes bytes into four private objects, removes raw, then completes with server claims", async () => {
    expect((await handle(request({ action: "complete-upload", uploadId: assetId }))).status).toBe(200);
    expect(storage.write).toHaveBeenCalledTimes(4); expect(vi.mocked(storage.write).mock.calls.every(([bucket]) => bucket === MEDIA_PRIVATE_BUCKET)).toBe(true);
    expect(storage.remove).toHaveBeenCalledWith(MEDIA_PRIVATE_BUCKET, [rawPath]);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_media_upload_complete", expect.objectContaining({ session_claims: claims, media: expect.objectContaining({ mime: "image/webp", width: 48 }) }), undefined);
  });
  it("rejects disguised bytes and audits rejection without inserting an asset", async () => {
    vi.mocked(storage.read).mockResolvedValue(Buffer.from("<svg/>"));
    const result = await handle(request({ action: "complete-upload", uploadId: assetId })); expect((await result.json()).state).toBe("upload-invalid");
    expect(storage.write).not.toHaveBeenCalled(); expect(storage.remove).toHaveBeenCalledWith(MEDIA_PRIVATE_BUCKET, [rawPath]);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_media_upload_reject", expect.anything(), undefined);
  });
  it("cleans a duplicate upload's derivatives while preserving the incumbent asset", async () => {
    replies.msrc_staff_media_upload_complete = { state: "duplicate", asset: { ...asset, id: actorId, storagePath: `${config.editionKey}/${actorId}/image.webp` } };
    expect((await handle(request({ action: "complete-upload", uploadId: assetId }))).status).toBe(200);
    expect(storage.remove).toHaveBeenLastCalledWith(MEDIA_PRIVATE_BUCKET, [storagePath, storagePath.replace(".webp", ".640.webp"), storagePath.replace(".webp", ".1280.webp"), storagePath.replace(".webp", ".1920.webp")]);
  });
  it.each(["busy", "expired", "denied"])("does not access raw storage after upload claim %s", async (state) => {
    replies.msrc_staff_media_upload_claim = { state }; expect((await handle(request({ action: "complete-upload", uploadId: assetId }))).ok).toBe(false);
    expect(storage.read).not.toHaveBeenCalled(); expect(storage.write).not.toHaveBeenCalled();
  });
  it.each(["alt_required", "rights_required", "conflict", "busy", "denied"])("does not publish after database %s", async (state) => {
    replies.msrc_staff_media_transition_begin = { state }; expect((await handle(transition())).ok).toBe(false); expect(storage.write).not.toHaveBeenCalled();
  });
  it("publishes only the four sanitized copies before service completion", async () => {
    expect((await handle(transition())).status).toBe(200); expect(storage.write).toHaveBeenCalledTimes(4);
    expect(vi.mocked(storage.write).mock.calls.every(([bucket]) => bucket === MEDIA_PUBLIC_BUCKET)).toBe(true);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_media_transition_finish", expect.objectContaining({ operation_id: operationId, success: true, session_claims: claims }), undefined);
  });
  it.each(["unpublish", "archive"])("removes every public variant before acknowledging %s", async (action) => {
    expect((await handle(transition(action))).status).toBe(200);
    expect(storage.remove).toHaveBeenCalledWith(MEDIA_PUBLIC_BUCKET, expect.arrayContaining([publicPath, publicPath.replace(".webp", ".640.webp")]));
    expect(vi.mocked(storage.remove).mock.calls[0][1]).toHaveLength(4); expect(storage.write).not.toHaveBeenCalled();
  });
  it("does not release the lock after an ambiguous storage write or removal", async () => {
    vi.mocked(storage.write).mockRejectedValue(new Error("network failed")); expect((await handle(transition())).status).toBe(503);
    vi.mocked(storage.remove).mockRejectedValue(new Error("network failed")); expect((await handle(transition("archive"))).status).toBe(503);
    expect(vi.mocked(backend.rpc).mock.calls.some(([name]) => name === "msrc_staff_media_transition_finish")).toBe(false);
  });
  it("releases a failed publication only when no public write was attempted", async () => {
    vi.mocked(storage.read).mockRejectedValue(new Error("unavailable")); expect((await handle(transition())).status).toBe(503);
    expect(storage.write).not.toHaveBeenCalled(); expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_media_transition_finish", expect.objectContaining({ success: false }), undefined);
  });
  it("replaying completed operation never repeats public writes", async () => {
    replies.msrc_staff_media_transition_begin = { state: "completed", asset: { ...asset, state: "published", publicPath } };
    expect((await handle(transition())).status).toBe(200); expect(storage.write).not.toHaveBeenCalled();
  });
  it("saves all localized fields and version only through staff RPC", async () => {
    expect((await handle(request({ action: "save", assetId, version: 1, ...fields }))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_media_update", { edition_key: config.editionKey, asset_id: assetId, expected_version: 1, fields }, accessToken);
  });
});
