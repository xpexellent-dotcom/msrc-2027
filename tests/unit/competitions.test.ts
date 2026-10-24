import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyHackathonDocument, emptyThesisDocument, HACKATHON_TRACKS } from "@/features/competitions/contracts";
import { countPitchWords, validateCompetitionDocument, competitionEntryProjection, competitionSettingsProjection, hackathonProfileProjection } from "@/features/competitions/validation";
import { CompetitionRpcMissingError, createCompetitionBackend, type CompetitionBackend } from "@/features/competitions/backend.server";
import { createCompetitionHandler } from "@/features/competitions/handler.server";
import { competitionFormToken, readCompetitionFormToken, readCompetitionJson } from "@/features/competitions/security.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { competitionUploadOrigin, isCompetitionEntryPage, isPrivatePage } from "@/lib/content-security-policy";

const origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 24, 15);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001", entryId = "dc000000-0000-4000-8000-000000000001", operationId = "df000000-0000-4000-8000-000000000001";
const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64), PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", RESEND_API_KEY: "re_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Invalid synthetic fixture");
const config = readiness.config, document = { ...emptyHackathonDocument(), title: "Synthetic title", pitch: "Synthetic pitch" };
const settings = { stageStates: { entry: "not_ready", selection: "not_ready", judging: "not_ready", final_material: "not_ready", membership: "not_ready" }, pitchPrompt: null, finalistCapPerTrack: null, filesReady: false };
const entry = { id: entryId, kind: "hackathon", version: 1, status: "draft", document, roster: [{ id: actorId, email: "synthetic@example.invalid", isLead: true, confirmed: false }], files: [], outcome: null };
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: now / 1000 + 3600, amr: [{ method: "password", timestamp: now / 1000 }] };
function fixture(options: { missing?: boolean; identity?: string | null; data?: unknown; result?: unknown; onIdentity?: () => void } = {}) {
  const backend: CompetitionBackend = { identity: vi.fn(async () => { options.onIdentity?.(); return "identity" in options ? options.identity! : actorId; }), refresh: vi.fn(async () => null), rpc: vi.fn(async (name) => {
    if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
    if (name === "msrc_competitions_status") return { enabled: true };
    if (options.missing) throw new CompetitionRpcMissingError();
    if (name === "msrc_competitions_me") return options.data ?? { state: "ready", settings: { hackathon: settings, three_minute_thesis: settings }, entries: [entry], hackathonProfile: null };
    return options.result ?? { state: "saved", entry };
  }) };
  const storage = { sign: vi.fn(async () => "http://127.0.0.1:3218/storage/synthetic") };
  const handle = createCompetitionHandler({ readiness: () => readiness, backend: () => backend, now: () => now, storage: () => storage });
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const cookie = participantCookie(config, { actorId, sessionId, accessToken, refreshToken: "synthetic", deadline: now + 71 * 3600_000, origin }, now).split(";")[0];
  const formToken = competitionFormToken(config, origin, actorId, sessionId, now);
  return { backend, storage, get: (headers = {}) => handle(new Request(origin + "/api/competitions", { headers: { cookie, ...headers } })),
    post: (extra: Record<string, unknown> = {}, headers = {}) => handle(new Request(origin + "/api/competitions", { method: "POST", headers: { origin, cookie, "content-type": "application/json", ...headers }, body: JSON.stringify({ action: "save", kind: "hackathon", entryId, expectedVersion: 1, operationId, formToken, document, ...extra }) })) };
}
beforeEach(() => vi.stubEnv("COMPETITIONS_ENABLED", "true"));
describe("TRK-01 distinct project schemas and HAC-04 exact pitch count", () => {
  it.each([["alpha beta", 2], ["alpha-beta / !!! 2027", 2], ["alpha\u00a0beta\u2003gamma\n delta", 4], ["مرحبا 世界 café ١٢٣", 4], ["\t-- … 👩‍⚕️", 0], ["A\ufeffB\vC\fD\rE", 5], ["alpha\u0085beta", 1]])("counts %j as %d", (text, count) => expect(countPitchWords(String(text))).toBe(count));
  it("allows exactly two named tracks", () => { expect(Object.values(HACKATHON_TRACKS)).toEqual(["Evidence to Impact", "Research Reimagined"]); expect(validateCompetitionDocument("hackathon", { ...document, track: "third" })).toBeNull(); });
  it("accepts 300 pitch words; rejects 301 while excluding the title", () => { expect(validateCompetitionDocument("hackathon", { ...document, title: "title ".repeat(301), pitch: "word ".repeat(300) })).not.toBeNull(); expect(validateCompetitionDocument("hackathon", { ...document, pitch: "word ".repeat(301) })).toBeNull(); });
  it("does not inherit the abstract word limit or form fields for 3MT", () => { expect(validateCompetitionDocument("three_minute_thesis", { ...emptyThesisDocument(), narrative: "word ".repeat(301) })).not.toBeNull(); expect(validateCompetitionDocument("three_minute_thesis", document)).toBeNull(); });
  it.each(["nationalId", "phone", "supervisor", "reviewer", "leadId", "roster", "aiOriginality"])("rejects uncontracted %s", (key) => expect(validateCompetitionDocument("hackathon", { ...document, [key]: "secret" })).toBeNull());
  it("accepts unresolved null settings without inventing values", () => expect(competitionSettingsProjection(settings)).not.toBeNull());
  it("rejects extra identity/review information in participant projections", () => { expect(competitionEntryProjection({ ...entry, reviews: [] })).toBeNull(); expect(competitionEntryProjection({ ...entry, roster: [{ ...entry.roster[0], nationalId: "private" }] })).toBeNull(); });
  it("refuses invalid solo/team roster projections", () => { expect(competitionEntryProjection({ ...entry, roster: [] })).toBeNull(); expect(competitionEntryProjection({ ...entry, roster: [entry.roster[0], { ...entry.roster[0], id: operationId, isLead: false }] })).toBeNull(); });
  it("keeps hackathon contact profiles separate from the anonymous document", () => {
    const profile = { university: "Synthetic university", fieldOfStudy: "Research", phone: "+966500000000", enrolledInSaudiUniversity: true };
    expect(hackathonProfileProjection(profile)).toEqual(profile);
    expect(hackathonProfileProjection({ ...profile, nationalId: "private" })).toBeNull();
    expect(validateCompetitionDocument("hackathon", { ...document, phone: profile.phone })).toBeNull();
  });
  it("refuses finalist workspace leaks before acceptance", () => {
    const finalistWorkspace = { orientationDetails: null, timetable: null, whatsappSupportUrl: "https://chat.whatsapp.com/synthetic", finalDeckLockAt: null, participantInstructions: null, confirmed: false };
    expect(competitionEntryProjection({ ...entry, finalistWorkspace })).toBeNull();
    expect(competitionEntryProjection({ ...entry, status: "accepted", finalistWorkspace })).not.toBeNull();
    expect(competitionEntryProjection({ ...entry, status: "accepted", finalistWorkspace: { ...finalistWorkspace, whatsappSupportUrl: "javascript:alert(1)" } })).toBeNull();
  });
});
describe("closed participant competition transport", () => {
  it("fails closed before touching backend", async () => { vi.stubEnv("COMPETITIONS_ENABLED", ""); const f = fixture(); expect((await f.get()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalled(); });
  it("returns a private own-entry projection", async () => { const r = await fixture().get(); expect(r.status).toBe(200); expect(r.headers.get("cache-control")).toContain("no-store"); expect((await r.json()).entries).toEqual([entry]); });
  it("maps missing migration to area-not-ready while retaining sign-in", async () => { const r = await fixture({ missing: true }).get(); expect(await r.json()).toEqual({ state: "area-not-ready" }); expect(r.headers.get("set-cookie")).toBeNull(); });
  it.each([null, operationId])("rejects native identity mismatch %s", async (identity) => expect((await fixture({ identity }).get()).status).toBe(401));
  it("requires a session", async () => expect((await fixture().get({ cookie: "" })).status).toBe(401));
  it.each([{ origin: "https://attacker.invalid" }, { "sec-fetch-site": "cross-site" }])("rejects cross-origin mutations %#", async (headers) => expect((await fixture().post({}, headers)).status).toBe(400));
  it("requires exact session CSRF and refuses client actor IDs", async () => { expect((await fixture().post({ formToken: "" })).status).toBe(400); expect((await fixture().post({ actorId })).status).toBe(400); });
  it("rejects excess pitch words before invoking a mutation", async () => { const f = fixture(); expect((await f.post({ document: { ...document, pitch: "word ".repeat(301) } })).status).toBe(400); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_competitions_save_draft", expect.anything()); });
  it("sends verified claims/version/idempotency key without user metadata", async () => { const f = fixture(); expect((await f.post()).status).toBe(200); expect(f.backend.rpc).toHaveBeenCalledWith("msrc_competitions_save_draft", { edition_key: config.editionKey, session_claims: claims, competition_type: "hackathon", entry_id: entryId, expected_version: 1, operation_id: operationId, document }); });
  it("submits only a saved version", async () => { const f = fixture({ result: { state: "submitted", entry } }); expect((await f.post({ action: "submit", document: undefined })).status).toBe(200); expect(f.backend.rpc).toHaveBeenCalledWith("msrc_competitions_submit", expect.objectContaining({ entry_id: entryId, expected_version: 1 })); expect((await f.post({ action: "submit" })).status).toBe(400); });
  it("does not disclose project material in an invite call", async () => { const f = fixture({ result: { state: "invited", entry } }); expect((await f.post({ action: "invite", document: undefined, email: "synthetic-member@example.invalid" })).status).toBe(200); expect(f.backend.rpc).toHaveBeenCalledWith("msrc_competitions_member_action", expect.objectContaining({ action: "invite", email: "synthetic-member@example.invalid", member_id: null })); });
  it.each(["conflict", "locked", "full", "invalid", "evidence_gate", "settings_incomplete"])("retains saved data on %s", async (state) => { const r = await fixture({ result: { state } }).post(); expect(r.status).toBe(409); expect((await r.json()).outcome).toBe(state); });
  it("rechecks the runtime gate before collection", async () => { const f = fixture({ onIdentity: () => vi.stubEnv("COMPETITIONS_ENABLED", "") }); expect((await f.post()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_competitions_save_draft", expect.anything()); });
  it("rejects overreturned confidential payloads", async () => expect(await (await fixture({ data: { state: "ready", settings: {}, entries: [], reviews: [] } }).get()).json()).toEqual({ state: "unavailable" }));
  it("does not sign a file URL if DB file gate is closed", async () => { const f = fixture({ result: { state: "closed" } }); expect((await f.post({ action: "file_read", document: undefined, fileId: operationId })).status).toBe(503); expect(f.storage.sign).not.toHaveBeenCalled(); });
  it("signs only the exact authorized edition/entry/file path", async () => { const path = config.editionKey + "/" + entryId + "/" + operationId;
    const f = fixture({ result: { state: "available", bucket: "msrc-competition-files", path } }); expect((await f.post({ action: "file_read", document: undefined, fileId: operationId })).status).toBe(200); expect(f.storage.sign).toHaveBeenCalledWith(path, false);
    const malicious = fixture({ result: { state: "available", bucket: "msrc-competition-files", path: "other-entry/private" } }); expect((await malicious.post({ action: "file_read", document: undefined, fileId: operationId })).status).toBe(503); expect(malicious.storage.sign).not.toHaveBeenCalled();
  });
  it("rejects uncontracted file paths, MIME types and excessive size", async () => { for (const metadata of [{ name: "../secret.pdf", mime: "application/pdf", size: 10, stage: "supporting" }, { name: "file.html", mime: "text/html", size: 10, stage: "supporting" }, { name: "file.pdf", mime: "application/pdf", size: 26214401, stage: "supporting" }]) expect((await fixture().post({ action: "file_reserve", document: undefined, metadata })).status).toBe(400); });
  it("bounds JSON stream bytes", async () => await expect(readCompetitionJson(new Request(origin, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: "a".repeat(256 * 1024) }) }))).rejects.toThrow());
  it("binds form tokens to actor, session, origin and expiry", () => { const token = competitionFormToken(config, origin, actorId, sessionId, now); expect(readCompetitionFormToken(config, token, origin, actorId, sessionId, now)).toBe(true); expect(readCompetitionFormToken(config, token, origin, actorId, operationId, now)).toBe(false); expect(readCompetitionFormToken(config, token, origin, actorId, sessionId, now + 30 * 60_000)).toBe(false); });
  it("maps only missing RPC errors to pending migration", async () => { vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 }))); await expect(createCompetitionBackend(config).rpc("msrc_competitions_me")).rejects.toBeInstanceOf(CompetitionRpcMissingError); });
  it("saves a private profile through the server-only framework RPC", async () => {
    const profile = { university: "Synthetic university", fieldOfStudy: "Research", phone: "+966500000000", enrolledInSaudiUniversity: true };
    const f = fixture({ result: { state: "profile_saved" } });
    expect((await f.post({ action: "profile", document: undefined, entryId: null, expectedVersion: 0, profile })).status).toBe(200);
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_competitions_hackathon_action", expect.objectContaining({ action: "profile", entry_id: null, payload: profile, session_claims: claims }));
    expect((await f.post({ action: "profile", document: undefined, profile: { ...profile, actorId } })).status).toBe(400);
  });
});
describe("competition document CSP", () => {
  it.each(["/en/entries", "/ar/entries", "/en/reviewer/competitions", "/ar/judge/competitions"])("treats %s as private", (path) => expect(isPrivatePage(path)).toBe(true));
  it("scopes Storage connections to the entry page", () => { expect(isCompetitionEntryPage("/en/entries")).toBe(true); expect(isCompetitionEntryPage("/en/hackathon")).toBe(false); expect(competitionUploadOrigin({ COMPETITIONS_ENABLED: "true" })).toBeUndefined(); });
});
