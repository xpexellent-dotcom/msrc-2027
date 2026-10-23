import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createAdvisoryHandler } from "@/features/staff-portal/advisory-handler.server";
import { StaffRpcMissingError, type StaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { decodeAdvisoryResponse, decodeAdvisorySettings, emptyAdvisorySettings, type AdvisorySettings } from "@/features/staff-portal/advisory-contract";

const origin = "http://127.0.0.1:3219", now = Date.parse("2026-10-23T06:00:00Z");
const actorId = "7a000000-0000-4000-8000-000000000001", sessionId = "7a000000-0000-4000-8000-000000000002", itemId = "7a000000-0000-4000-8000-000000000003", otherId = "7a000000-0000-4000-8000-000000000004";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000, amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const accessToken = "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature";
const native: NativeStaffSession = { actorId, sessionId, accessToken, refreshToken: "synthetic-refresh" };
const rubric = [{ id: "synthetic-criterion", label: "Synthetic criterion", weight: 1, min: 0, max: 10 }];
const record = () => ({ id: itemId, reference: "SYN-ADVISORY-1", submissionVersion: 1, rubricVersion: 2, model: "deepseek-flash", promptVersion: "staff-advisory-v1", createdAt: "2026-10-23T05:00:00Z", rubric, scores: [{ criterionId: "synthetic-criterion", value: 0, rationale: "Synthetic evidence is incomplete." }] });
const configured = (): AdvisorySettings => ({ enabled: false, reviewerVisible: false, noticeReference: "synthetic-notice-reference", evaluationReference: "synthetic-evaluation-reference", operatingReference: "synthetic-operating-reference", model: "deepseek-flash", maxPerRun: 3, maxPerDay: 10, estimatedCostPerAbstract: 0.01, dailyCostCap: 1, currency: "USD", maxAttempts: 2, maxTokens: 4096 });
const start = () => ({ action: "start", operationId: actorId, submissionIds: [itemId] });
let roles: Role[], policySatisfied: boolean, backend: StaffBackend, replies: Record<string, unknown>, env: Record<string, string | undefined>;
function persisted() { const superAdmin = roles.includes("superAdmin"); return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true, authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: policySatisfied, reason: policySatisfied ? null : superAdmin ? "mfa_required" : "staff_email_check_required", mfaValid: superAdmin && policySatisfied, passwordValid: true, staffEmailValid: !superAdmin && policySatisfied, emailVerified: true, timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(), absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() }, policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false }; }
function request(body?: Record<string, unknown>, query = "?area=workspace", signedIn = true, extraHeaders: Record<string, string> = {}) { return new Request(origin + "/api/staff-portal/advisory" + query, { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3219", ...(signedIn ? { cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0] } : {}), ...(body ? { origin, "Content-Type": "application/json" } : {}), ...extraHeaders }, body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined }); }
const handle = (input: Request) => createAdvisoryHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now, env })(input);
const advisoryCalls = () => vi.mocked(backend.rpc).mock.calls.filter(([name]) => name.startsWith("msrc_staff_advisory_"));
beforeEach(() => {
  roles = ["scientificAdministrator"]; policySatisfied = true; env = { AI_ASSESSMENT_ENABLED: "true", DEEPSEEK_API_KEY: "synthetic-deepseek-key-never-valid" };
  replies = {
    msrc_staff_advisory_workspace: { state: "ready", version: 0, settings: emptyAdvisorySettings(), eligibleCount: 1, candidates: [{ id: itemId, reference: "SYN-1", submissionVersion: 1, rubricVersion: 2, title: "Synthetic sanitized title" }], records: [], runs: [] },
    msrc_staff_advisory_calibration: { state: "ready", pairs: [] },
    msrc_staff_advisory_reviewer: { state: "ready", advisory: null },
    msrc_staff_advisory_save_settings: { state: "updated", version: 1 },
    msrc_staff_advisory_start: { state: "queued", runId: itemId, count: 1 },
  };
  backend = { rpc: vi.fn(async (name) => { if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 }; if (name === "msrc_staff_form_claim") return { state: "claimed" }; if (name === "msrc_session_context") return persisted(); if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Scientist", roles, session: persisted() }; const result = replies[name]; if (result instanceof Error) throw result; return result ?? null; }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});

describe("AI advisory staff authorization and durable batch boundary", () => {
  it.each(ROLES)("restricts workspace, calibration, settings and start independently for %s", async role => {
    roles = [role]; const expected = ["scientificAdministrator", "superAdmin"].includes(role) ? 200 : 403;
    expect((await handle(request())).status).toBe(expected);
    expect((await handle(request(undefined, "?area=calibration"))).status).toBe(expected);
    expect((await handle(request({ action: "save-settings", version: 0, settings: emptyAdvisorySettings() }))).status).toBe(expected);
    expect((await handle(request(start()))).status).toBe(expected);
  });
  it.each(ROLES)("restricts assigned-reviewer projection for %s", async role => {
    roles = [role]; expect((await handle(request(undefined, `?area=reviewer&assignmentId=${itemId}`))).status).toBe(role === "abstractReviewer" ? 200 : 403);
  });
  it.each(["scientificAdministrator", "superAdmin", "abstractReviewer"] as const)("rejects unsatisfied exact-session assurance for %s", async role => {
    roles = [role]; policySatisfied = false; expect((await handle(request())).status).toBe(403); expect(advisoryCalls()).toHaveLength(0);
  });
  it("closes before backend access when the staff portal is disabled", async () => {
    const response = await createAdvisoryHandler({ readiness: () => ({ state: "closed" }), backend: () => backend, env })(request());
    expect(response.status).toBe(503); expect(backend.rpc).not.toHaveBeenCalled();
  });
  it("rejects absent and mismatched native identity", async () => {
    expect((await handle(request(undefined, "?area=workspace", false))).status).toBe(403);
    vi.mocked(backend.identity).mockResolvedValue(otherId); expect((await handle(request())).status).toBe(403); expect(advisoryCalls()).toHaveLength(0);
  });
  it.each<Record<string, string>>([{ origin: "https://hostile.invalid" }, { "sec-fetch-site": "cross-site" }])("rejects cross-origin mutation", async headers => {
    expect((await handle(request(start(), "", true, headers))).status).toBe(400); expect(advisoryCalls()).toHaveLength(0);
  });
  it("requires a valid form token and successful nonce claim", async () => {
    expect((await handle(request({ ...start(), formToken: "" }))).status).toBe(400); expect(advisoryCalls()).toHaveLength(0);
    const original = vi.mocked(backend.rpc).getMockImplementation()!;
    vi.mocked(backend.rpc).mockImplementation(async (...args) => args[0] === "msrc_staff_form_claim" ? { state: "limited" } : original(...args));
    expect((await handle(request(start()))).status).toBe(429); expect(advisoryCalls()).toHaveLength(0);
  });
  it.each(["", "?area=unknown", "?area=workspace&area=workspace", "?area=workspace&extra=1", "?area=reviewer&assignmentId=bad", `?area=calibration&assignmentId=${itemId}`])("rejects malformed query %s", async query => {
    expect((await handle(request(undefined, query))).status).toBe(400); expect(advisoryCalls()).toHaveLength(0);
  });
  it.each(["workspace", "calibration", "reviewer", "save_settings", "start"])("missing %s RPC degrades gracefully without logout", async area => {
    replies[`msrc_staff_advisory_${area}`] = new StaffRpcMissingError();
    if (area === "reviewer") roles = ["abstractReviewer"];
    const input = area === "save_settings" ? request({ action: "save-settings", version: 0, settings: emptyAdvisorySettings() }) : area === "start" ? request(start()) : request(undefined, area === "reviewer" ? `?area=reviewer&assignmentId=${itemId}` : `?area=${area}`);
    const response = await handle(input); expect(response.status).toBe(503); expect((await response.json()).state).toBe("area-not-ready");
    expect(response.headers.get("set-cookie")).toBeNull(); expect(backend.logout).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "false", "TRUE", "1"])("never starts a batch with env flag %s", async flag => {
    env.AI_ASSESSMENT_ENABLED = flag; const response = await handle(request(start()));
    expect(response.status).toBe(409); expect((await response.json()).state).toBe("disabled"); expect(advisoryCalls()).toHaveLength(0);
    const workspace = await handle(request()); expect(workspace.status).toBe(200); expect((await workspace.json()).runtimeReady).toBe(false);
  });
  it.each([undefined, "", "short", "invalid key contains whitespace"])("never starts without a valid server credential", async key => {
    env.DEEPSEEK_API_KEY = key; expect((await handle(request(start()))).status).toBe(409); expect(advisoryCalls()).toHaveLength(0);
  });
  it("honors the separate database disabled gate even when env is enabled", async () => {
    replies.msrc_staff_advisory_start = { state: "disabled", prompt: "PRIVATE PROMPT" };
    const response = await handle(request(start())); expect(response.status).toBe(409); expect((await response.json()).state).toBe("disabled");
  });
  it.each(["budget_exceeded", "settings_incomplete", "stale_snapshot", "packet_required", "conflict"])("preserves database guard %s", async state => {
    replies.msrc_staff_advisory_start = { state }; const response = await handle(request(start())); expect(response.status).toBe(409); expect((await response.json()).state).toBe(state.replaceAll("_", "-"));
  });
  it("sends explicit staff-entered budgets unchanged to the database", async () => {
    const settings = configured(); expect((await handle(request({ action: "save-settings", version: 4, settings }))).status).toBe(200);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_advisory_save_settings", { edition_key: config.editionKey, expected_version: 4, configuration: settings }, accessToken);
  });
  it("retains database authority over scientist changes to owner activation and reviewer visibility", async () => {
    replies.msrc_staff_advisory_save_settings = { state: "denied" }; const response = await handle(request({ action: "save-settings", version: 0, settings: { ...configured(), enabled: true, reviewerVisible: true } }));
    expect(response.status).toBe(403); expect((await response.json()).state).toBe("denied");
  });
  it("starts only the named finalized candidates with a caller idempotency key", async () => {
    const response = await handle(request(start())); expect(response.status).toBe(200); expect((await response.json()).runId).toBe(itemId);
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_advisory_start", { edition_key: config.editionKey, operation_id: actorId, submission_ids: [itemId] }, accessToken);
    expect(advisoryCalls().map(([name]) => name)).toEqual(["msrc_staff_advisory_start"]);
  });
  it.each([{ submissionIds: [] }, { submissionIds: [itemId, itemId] }, { submissionIds: ["bad"] }, { operationId: "bad" }, { prompts: ["PRIVATE PROMPT"] }, { scores: [{ value: 10 }] }])("rejects malformed or provider-shaped start payloads", async change => {
    expect((await handle(request({ ...start(), ...change }))).status).toBe(400); expect(advisoryCalls()).toHaveLength(0);
  });
  it.each(["publish", "decision", "scorecard", "delete", "reveal-to-authors", "run-worker"])("exposes no %s mutator", async action => {
    expect((await handle(request({ action, submissionId: itemId }))).status).toBe(400); expect(advisoryCalls()).toHaveLength(0);
  });
  it("never logs raw database failures or signs staff out", async () => {
    replies.msrc_staff_advisory_workspace = new Error("PRIVATE PROMPT PRIVATE KEY"); const logger = vi.spyOn(console, "error");
    const response = await handle(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("PRIVATE"); expect(logger).not.toHaveBeenCalled(); expect(backend.logout).not.toHaveBeenCalled();
  });
  it("keeps staff advisory responses private and uncached", async () => {
    const response = await handle(request()); expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("referrer-policy")).toBe("no-referrer"); expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});

describe("advisory response minimization and calibration", () => {
  it("strips identity, prompt and cross-area extras from all workspace projections", async () => {
    replies.msrc_staff_advisory_workspace = { ...(replies.msrc_staff_advisory_workspace as object), authors: [{ name: "PRIVATE AUTHOR" }], prompt: "PRIVATE PROMPT", candidates: [{ id: itemId, reference: "SYN-1", submissionVersion: 1, rubricVersion: 2, title: "Synthetic title", email: "PRIVATE EMAIL" }], records: [{ ...record(), author: "PRIVATE AUTHOR", outputs: "PRIVATE OUTPUT", scores: [{ ...record().scores[0], privatePrompt: "PRIVATE PROMPT" }] }], runs: [{ id: otherId, createdAt: "2026-10-23T05:00:00Z", count: 2, completed: 1, failed: 1, pending: 0, estimatedCost: 0.02, currency: "USD", errors: [{ code: "invalid_output", count: 1, message: "PRIVATE PROVIDER DIAGNOSTIC" }], prompt: "PRIVATE PROMPT" }] };
    const response = await handle(request()), value = await response.json(); expect(response.status).toBe(200); expect(JSON.stringify(value)).not.toContain("PRIVATE"); expect(value.records[0].scores[0].value).toBe(0); expect(value.runs[0].errors).toEqual([{ code: "invalid_output", count: 1 }]);
  });
  it("reviewer visibility remains empty until the database permits the assignment", async () => {
    roles = ["abstractReviewer"]; const response = await handle(request(undefined, `?area=reviewer&assignmentId=${itemId}`)); expect(response.status).toBe(200); expect((await response.json()).advisory).toBeNull();
    expect(backend.rpc).toHaveBeenCalledWith("msrc_staff_advisory_reviewer", { edition_key: config.editionKey, assignment_id: itemId }, accessToken);
  });
  it("never widens reviewer projection to other records, calibration or settings", async () => {
    roles = ["abstractReviewer"]; replies.msrc_staff_advisory_reviewer = { state: "ready", advisory: record(), settings: configured(), records: [{ ...record(), reference: "PRIVATE OTHER ABSTRACT" }], pairs: [{ authorName: "PRIVATE AUTHOR" }] };
    const response = await handle(request(undefined, `?area=reviewer&assignmentId=${itemId}`)); const value = await response.json(); expect(response.status).toBe(200); expect(value.advisory).toEqual(record()); expect(value).not.toHaveProperty("settings"); expect(value).not.toHaveProperty("records"); expect(JSON.stringify(value)).not.toContain("PRIVATE");
  });
  it.each(["duplicate", "range", "unknown", "missing", "text_score"])("discards malformed %s advisory records", async variant => {
    const value = record(); if (variant === "duplicate") value.scores.push(value.scores[0]); if (variant === "range") value.scores[0].value = 11; if (variant === "unknown") value.scores[0].criterionId = "unknown"; if (variant === "missing") value.scores = []; if (variant === "text_score") Object.assign(value.scores[0], { value: "5" });
    replies.msrc_staff_advisory_workspace = { ...(replies.msrc_staff_advisory_workspace as object), records: [value], rawOutput: "PRIVATE" };
    const response = await handle(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("PRIVATE");
  });
  it("computes descriptive calibration and returns no row-level pairs or identities", async () => {
    replies.msrc_staff_advisory_calibration = { state: "ready", pairs: [
      { submissionId: itemId, submissionVersion: 1, rubricVersion: 2, criterionId: "synthetic-criterion", min: 0, max: 10, aiScore: 2, humanScore: 1, authorName: "PRIVATE AUTHOR" },
      { submissionId: otherId, submissionVersion: 1, rubricVersion: 2, criterionId: "synthetic-criterion", min: 0, max: 10, aiScore: 8, humanScore: 9 },
    ], prompt: "PRIVATE PROMPT" };
    const response = await handle(request(undefined, "?area=calibration")), value = await response.json(); expect(response.status).toBe(200);
    expect(value.calibration).toMatchObject({ pairCount: 2, abstractCount: 2, exactAgreementRate: 0 }); expect(value.calibration.pearsonCorrelation).toBeCloseTo(1); expect(value.calibration.meanAbsoluteDifference).toBeCloseTo(0.1);
    expect(value).not.toHaveProperty("pairs"); expect(JSON.stringify(value)).not.toMatch(/PRIVATE|7a000000/); expect(value.calibration).not.toHaveProperty("approved");
  });
  it("rejects duplicate calibration joins rather than inflating sample size", async () => {
    const pair = { submissionId: itemId, submissionVersion: 1, rubricVersion: 2, criterionId: "synthetic-criterion", min: 0, max: 10, aiScore: 2, humanScore: 1 };
    replies.msrc_staff_advisory_calibration = { state: "ready", pairs: [pair, pair] }; expect((await handle(request(undefined, "?area=calibration"))).status).toBe(503);
  });
  it("rejects inconsistent run counts and raw diagnostic error codes", () => {
    const base = replies.msrc_staff_advisory_workspace as Record<string, unknown>, run = { id: otherId, createdAt: "2026-10-23T05:00:00Z", count: 1, completed: 0, failed: 1, pending: 0, estimatedCost: 0.01, currency: "USD", errors: [{ code: "invalid_output", count: 1 }] };
    expect(decodeAdvisoryResponse("workspace", { ...base, runs: [{ ...run, pending: 1 }] })).toBeNull();
    expect(decodeAdvisoryResponse("workspace", { ...base, runs: [{ ...run, errors: [{ code: "PRIVATE PROVIDER DIAGNOSTIC", count: 1 }] }] })).toBeNull();
  });
});

describe("no invented advisory activation or budget defaults", () => {
  it("defaults every operating value to unset and both switches to off", () => {
    const settings = emptyAdvisorySettings(); expect(settings.enabled).toBe(false); expect(settings.reviewerVisible).toBe(false);
    expect(Object.entries(settings).filter(([key]) => !["enabled", "reviewerVisible"].includes(key)).every(([, value]) => value === null)).toBe(true); expect(decodeAdvisorySettings(settings)).toEqual(settings);
  });
  it.each(["noticeReference", "evaluationReference", "operatingReference", "model", "maxPerRun", "maxPerDay", "estimatedCostPerAbstract", "dailyCostCap", "currency", "maxAttempts", "maxTokens"])("requires explicit %s before enabled configuration", key => {
    expect(decodeAdvisorySettings({ ...configured(), enabled: true, [key]: null })).toBeNull();
  });
  it.each([{ maxPerRun: 0 }, { maxPerDay: 0 }, { maxPerRun: 11 }, { estimatedCostPerAbstract: 0 }, { dailyCostCap: -1 }, { maxAttempts: 0 }, { maxAttempts: 6 }, { maxTokens: 0 }, { maxTokens: 16385 }, { currency: "usd" }, { model: "deepseek-v4-pro" }, { enabled: "true" }, { reviewerVisible: "true" }, { unexpected: "PRIVATE" }])("rejects invalid settings %j", change => {
    expect(decodeAdvisorySettings({ ...configured(), ...change })).toBeNull();
  });
  it("rejects enabled configuration whose retry reservation exceeds its cost cap", () => {
    expect(decodeAdvisorySettings({ ...configured(), enabled: true, estimatedCostPerAbstract: 0.6, maxAttempts: 2, dailyCostCap: 1 })).toBeNull();
  });
});
