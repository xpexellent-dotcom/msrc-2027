import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_POLICY } from "@/config/session-policy";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { createCheckInFallbackHandler } from "@/features/staff-portal/check-in-fallback-handler.server";
import type { NativeStaffSession, StaffBackend } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { staffCookie, staffFormToken } from "@/features/staff-portal/security.server";
import { csvCell, decodeOfflineImport, decodeRoster, parseOfflineSheet, rosterCsv } from "@/features/staff-portal/check-in-fallback-contract";
import { checkInFallbackCopy } from "@/features/staff-portal/check-in-fallback-copy";

// ENG-082 / CHK-05. Synthetic values only.
const origin = "http://127.0.0.1:3219", now = Date.parse("2027-01-27T09:00:00Z"), day = "2027-01-27";
const actorId = "38000000-0000-4000-8000-000000000001", sessionId = "38000000-0000-4000-8000-000000000002", operationId = "38000000-0000-4000-8000-000000000003";
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220",
  STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only", STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only",
  RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal2", exp: now / 1000 + 3600, iat: now / 1000,
  amr: [{ method: "password", timestamp: now / 1000 }, { method: "totp", timestamp: now / 1000 }] };
const native: NativeStaffSession = { actorId, sessionId, accessToken: "header." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".signature", refreshToken: "synthetic-refresh" };
let roles: Role[], mfa: boolean, backend: StaffBackend, replies: Record<string, unknown>;
function persisted() {
  const superAdmin = roles.includes("superAdmin");
  return { schemaVersion: 1, editionId: config.editionKey, principal: { userId: actorId, sessionId }, privileged: true,
    authenticationTier: superAdmin ? "super_admin" : "staff", sessionPolicySatisfied: true, reason: null,
    mfaValid: superAdmin && mfa, passwordValid: true, staffEmailValid: !superAdmin, emailVerified: true,
    timing: { startedAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString(),
      absoluteExpiresAt: new Date(now + 8 * 3600000).toISOString(), idleExpiresAt: new Date(now + 30 * 60000).toISOString(), authenticatedAt: new Date(now).toISOString() },
    policy: SESSION_POLICY, operationalAccessReady: false, privilegedAccessReady: false };
}
function request(method: "GET" | "POST", query = "", body?: Record<string, unknown>) {
  return new Request(origin + "/api/staff-portal/check-in-fallback" + query, { method, headers: { host: "127.0.0.1:3219",
    cookie: staffCookie(config, { ...native, origin, deadline: now + 8 * 3600000, challengeId: null, factorId: null, challengeExpiresAt: null }, now).split(";")[0],
    ...(method === "POST" ? { origin, "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify({ formToken: staffFormToken(config, origin, now), ...body }) : undefined });
}
const entries = [{ reference: "A1B2C3D4E5F6", time: "09:15", recorder: "AK" }, { reference: "0123456789AB", time: "09:20", recorder: "=cmd" }];
const roster = () => request("GET", `?area=roster&day=${day}`);
const importRows = (extra: Record<string, unknown> = {}) => request("POST", "", { action: "offline-import", day, operationId, entries, ...extra });
const handle = (input: Request) => createCheckInFallbackHandler({ readiness: () => ({ state: "ready", config }), backend: () => backend, now: () => now })(input);
const rpcNames = () => vi.mocked(backend.rpc).mock.calls.map(([name]) => name);

beforeEach(() => {
  roles = ["superAdmin"]; mfa = true;
  replies = {
    msrc_staff_checkin_roster: { state: "ready", day, rows: [{ reference: "A1B2C3D4E5F6", name: "Synthetic Attendee" }, { reference: "0123456789AB", name: "=HYPERLINK(\"x\")" }] },
    msrc_staff_checkin_offline_import: { state: "ready", day, outcomes: ["checked_in", "not_found"], counts: { checked_in: 1, not_found: 1 } },
  };
  backend = { rpc: vi.fn(async (name) => {
    if (name === "msrc_staff_status") return { enabled: true, emailDailyLimit: 40 };
    if (name === "msrc_staff_form_claim") return { state: "claimed" };
    if (name === "msrc_session_context") return persisted();
    if (name === "msrc_staff_profile") return { schemaVersion: 1, actorId, name: "Synthetic Owner", roles, session: persisted() };
    return replies[name] ?? null;
  }), identity: vi.fn(async () => actorId), refresh: vi.fn(async () => native), logout: vi.fn(async () => true) } as unknown as StaffBackend;
});

describe("ENG-082 offline sheet parsing", () => {
  it("reads comma, tab and quoted rows with an optional header", () => {
    expect(parseOfflineSheet("﻿reference,time,recorder\r\na1b2c3d4e5f6, 09:15 ,AK\n\n0123456789AB\t09:20:30\tSmith\n\"ABCDEF012345\",\"10:00\",\"Smith, J\"")).toEqual({ state: "ready", entries: [
      { reference: "A1B2C3D4E5F6", time: "09:15", recorder: "AK" }, { reference: "0123456789AB", time: "09:20:30", recorder: "Smith" }, { reference: "ABCDEF012345", time: "10:00", recorder: "Smith, J" }] });
  });
  it("accepts Arabic-Indic digits in references and times", () => {
    expect(parseOfflineSheet("٠١٢٣٤٥٦٧٨٩AB,٠٩:١٥,أ ك")).toEqual({ state: "ready", entries: [{ reference: "0123456789AB", time: "09:15", recorder: "أ ك" }] });
  });
  it.each([
    ["A1B2C3D4E5F,09:15,AK", 1], ["A1B2C3D4E5F6,24:00,AK", 1], ["A1B2C3D4E5F6,9:15,AK", 1], ["A1B2C3D4E5F6,09:15,", 1],
    ["A1B2C3D4E5F6,09:15", 1], ["A1B2C3D4E5F6,09:15,AK,extra", 1], ["A1B2C3D4E5F6,09:15,\"AK", 1], [`A1B2C3D4E5F6,09:15,${"x".repeat(81)}`, 1],
    ["A1B2C3D4E5F6,09:15,AK\nnot,a,row", 2], ["A1B2C3D4E5F6,09:15,A\u0007K", 1],
  ])("rejects malformed input %j", (text, line) => expect(parseOfflineSheet(text)).toEqual({ state: "malformed", line }));
  it("bounds empty and oversized sheets", () => {
    expect(parseOfflineSheet(" \n\r\n")).toEqual({ state: "empty" });
    expect(parseOfflineSheet("reference,time,recorder\n")).toEqual({ state: "empty" });
    expect(parseOfflineSheet(Array.from({ length: 2000 }, () => "A1B2C3D4E5F6,09:15,AK").join("\n")).state).toBe("ready");
    expect(parseOfflineSheet(Array.from({ length: 2001 }, () => "A1B2C3D4E5F6,09:15,AK").join("\n"))).toEqual({ state: "too_many" });
  });
});

describe("ENG-082 roster CSV and response decoding", () => {
  it("quotes every cell, neutralizes formulas and adds a UTF-8 BOM", () => {
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    for (const formula of ["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"]) expect(csvCell(formula).startsWith("\"'")).toBe(true);
    expect(rosterCsv([{ reference: "A1B2C3D4E5F6", name: "=HYPERLINK(\"x\")" }])).toBe("﻿\"reference\",\"name\"\r\n\"A1B2C3D4E5F6\",\"'=HYPERLINK(\"\"x\"\")\"\r\n");
  });
  it("rejects roster rows carrying anything beyond reference and name", () => {
    expect(decodeRoster({ state: "ready", day, rows: [{ reference: "A1B2C3D4E5F6", name: "Synthetic" }] }, day)).toEqual([{ reference: "A1B2C3D4E5F6", name: "Synthetic" }]);
    expect(decodeRoster({ state: "ready", day, rows: [{ reference: "A1B2C3D4E5F6", name: "Synthetic", email: "x@example.invalid" }] }, day)).toBeNull();
    expect(decodeRoster({ state: "ready", day, rows: [{ reference: "a1b2c3d4e5f6", name: "Synthetic" }] }, day)).toBeNull();
    expect(decodeRoster({ state: "ready", day: "2027-01-28", rows: [] }, day)).toBeNull();
    expect(decodeRoster({ state: "ready", day, rows: [], token: "x" }, day)).toBeNull();
  });
  it("requires one known outcome per row and matching counts", () => {
    expect(decodeOfflineImport({ state: "replayed", day, outcomes: ["checked_in"], counts: { checked_in: 1 } }, day, 1)?.state).toBe("replayed");
    expect(decodeOfflineImport({ state: "ready", day, outcomes: ["checked_in"], counts: { checked_in: 1 } }, day, 2)).toBeNull();
    expect(decodeOfflineImport({ state: "ready", day, outcomes: ["admitted"], counts: { admitted: 1 } }, day, 1)).toBeNull();
    expect(decodeOfflineImport({ state: "ready", day, outcomes: ["checked_in"], counts: { checked_in: 2 } }, day, 1)).toBeNull();
  });
  it("has an EN and AR label for every outcome", () => {
    expect(Object.keys(checkInFallbackCopy.ar.outcomes).sort()).toEqual(Object.keys(checkInFallbackCopy.en.outcomes).sort());
    expect(Object.keys(checkInFallbackCopy.ar.states).sort()).toEqual(Object.keys(checkInFallbackCopy.en.states).sort());
  });
});

describe("ENG-082 Super Admin boundary", () => {
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies %s before any roster or import RPC", async (role) => {
    roles = [role];
    expect((await handle(roster())).status).toBe(403);
    expect((await handle(importRows())).status).toBe(403);
    expect(rpcNames()).not.toContain("msrc_staff_checkin_roster");
    expect(rpcNames()).not.toContain("msrc_staff_checkin_offline_import");
  });
  it("denies a Super Admin session without valid TOTP assurance", async () => {
    mfa = false;
    expect((await handle(roster())).status).toBe(403);
    expect(rpcNames()).not.toContain("msrc_staff_checkin_roster");
  });
  it("downloads a private, formula-safe roster for one day", async () => {
    const response = await handle(roster());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toBe(`attachment; filename="checkin-roster-${day}.csv"`);
    const bytes = new Uint8Array(await response.arrayBuffer()), body = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(body.startsWith("﻿\"reference\",\"name\"")).toBe(true);
    expect(body).toContain("\"'=HYPERLINK");
    expect(vi.mocked(backend.rpc).mock.calls.find(([name]) => name === "msrc_staff_checkin_roster")?.[1]).toEqual({ edition_key: config.editionKey, day });
  });
  it.each(["?area=roster", "?area=roster&day=2027-02-30", "?area=other&day=2027-01-27", "?area=roster&day=2027-01-27&q=x"])("rejects roster query %s", async (query) => {
    expect((await handle(request("GET", query))).status).toBe(400);
  });
  it("maps refused roster states without returning a file", async () => {
    replies.msrc_staff_checkin_roster = { state: "wrong_day" };
    const response = await handle(roster());
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ state: "wrong-day" });
  });
  it("forwards a validated import once the form token is claimed", async () => {
    const response = await handle(importRows());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "updated", result: { state: "ready", outcomes: ["checked_in", "not_found"], counts: { checked_in: 1, not_found: 1 } } });
    expect(rpcNames().indexOf("msrc_staff_form_claim")).toBeLessThan(rpcNames().indexOf("msrc_staff_checkin_offline_import"));
    expect(vi.mocked(backend.rpc).mock.calls.find(([name]) => name === "msrc_staff_checkin_offline_import")?.[1]).toEqual({ edition_key: config.editionKey, day, operation_id: operationId, entries });
  });
  it.each([
    { operationId: "not-a-uuid" }, { day: "2027-1-27" }, { entries: [] }, { entries: Array.from({ length: 2001 }, () => entries[0]) },
    { entries: [{ reference: "A1B2C3D4E5F6", time: "09:15" }] }, { entries: [{ ...entries[0], extra: "x" }] }, { entries: [{ ...entries[0], recorder: 5 }] }, { unexpected: true },
  ])("rejects malformed import %#", async (extra) => {
    expect((await handle(importRows(extra))).status).toBe(400);
    expect(rpcNames()).not.toContain("msrc_staff_checkin_offline_import");
  });
  it("reports a reused batch ID and an undecodable reply safely", async () => {
    replies.msrc_staff_checkin_offline_import = { state: "conflict" };
    expect((await handle(importRows())).status).toBe(409);
    replies.msrc_staff_checkin_offline_import = { state: "ready", day, outcomes: ["checked_in"], counts: { checked_in: 1 } };
    expect((await handle(importRows())).status).toBe(503);
  });
});
