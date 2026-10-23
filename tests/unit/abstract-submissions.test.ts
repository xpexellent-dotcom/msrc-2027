import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import { AbstractRpcMissingError, createAbstractBackend, type AbstractBackend } from "@/features/submissions/backend.server";
import { createAbstractHandler } from "@/features/submissions/handler.server";
import { abstractFormToken, readAbstractFormToken, readAbstractJson } from "@/features/submissions/security.server";
import { abstractDocumentIssues, abstractSettingsProjection, abstractSubmissionProjection, countAbstractWords, validateAbstractDocument } from "@/features/submissions/validation";
import { ABSTRACT_LETTER_OR_NUMBER, ABSTRACT_WHITESPACE } from "@/features/submissions/word-ranges";
import { abstractDocument, abstractSettings, abstractSubmission } from "../fixtures/abstracts";

const origin = "http://127.0.0.1:3216", now = Date.UTC(2026, 9, 23, 12);
const actorId = "da000000-0000-4000-8000-000000000001", sessionId = "db000000-0000-4000-8000-000000000001", operationId = "df000000-0000-4000-8000-000000000001";
const readiness = resolveParticipantConfig({ PARTICIPANT_ACCOUNTS_ENABLED: "true", PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_AUTH_SECURITY_SECRET: "a".repeat(64),
  PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_participant_mock_only", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only",
  RESEND_API_KEY: "re_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027", PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT: "40" });
if (readiness.state !== "ready") throw new Error("Synthetic participant configuration");
const config = readiness.config;
const claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: now / 1000 + 3600, amr: [{ method: "password", timestamp: now / 1000 }] };
const token = (value: unknown = claims) => "synthetic." + Buffer.from(JSON.stringify(value)).toString("base64url") + ".synthetic";
function fixture(options: { error?: Error; identity?: string | null; context?: unknown; outcome?: string; claims?: unknown; onIdentity?: () => void } = {}) {
  const submission = { ...abstractSubmission, wordCount: countAbstractWords(abstractDocument.body) };
  const backend: AbstractBackend = { identity: vi.fn(async () => { options.onIdentity?.(); return Object.hasOwn(options, "identity") ? options.identity! : actorId; }), refresh: vi.fn(async () => null),
    rpc: vi.fn(async (name) => {
      if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_abstracts_status") return { enabled: true, settingsComplete: true };
      if (options.error) throw options.error;
      if (name === "msrc_abstracts_me") return options.context ?? { state: "ready", settings: abstractSettings, submissions: [submission] };
      if (name === "msrc_abstracts_save_draft") return { state: options.outcome ?? "saved", submission };
      if (name === "msrc_abstracts_finalize") return { state: options.outcome ?? "finalized", submission };
      throw new Error("Unexpected RPC");
    }) };
  const handle = createAbstractHandler({ readiness: () => readiness, backend: () => backend, now: () => now });
  const cookie = participantCookie(config, { actorId, sessionId, accessToken: token(options.claims), refreshToken: "synthetic", deadline: now + 72 * 3600_000, origin }, now).split(";")[0];
  const formToken = abstractFormToken(config, origin, actorId, sessionId, now);
  return { backend, formToken, get: (headers = {}) => handle(new Request(origin + "/api/abstracts", { headers: { cookie, ...headers } })),
    post: (extra: Record<string, unknown> = {}, headers = {}) => handle(new Request(origin + "/api/abstracts", { method: "POST", headers: { origin, cookie, "content-type": "application/json", ...headers },
      body: JSON.stringify({ action: "save", submissionId: submission.id, expectedVersion: 1, operationId, formToken, document: abstractDocument, ...extra }) })) };
}
beforeEach(() => vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "true"));
describe("ABS-04 exact shared body counter", () => {
  it.each([
    ["alpha beta", 2], ["alpha-beta alpha / !!! 2027", 3], ["alpha\u00a0beta\u2003gamma\n delta", 4],
    ["مرحبا 世界 café ١٢٣", 4], ["\t-- …  👩‍⚕️", 0], ["A\ufeffB\vC\fD\rE", 5], ["", 0],
    ["Ⅷ ½ ² 𞛀 𱍐 𝒜", 6], ["\u0301 \u200d \u0085 — ™ 🧬", 0], ["alpha\u0085beta", 1],
  ])("counts %j as %d", (value, total) => expect(countAbstractWords({ background: value })).toBe(total));
  it("excludes everything outside the five body fields", () => expect(countAbstractWords({ title: "extra title", keywords: "extra keywords", methods: "one" })).toBe(1));
  it("pins the same letter/number and whitespace sets in the browser and SQL independent of runtime Unicode upgrades", () => {
    const sql = readFileSync("supabase/migrations/20261023040912_abstract_submission_review.sql", "utf8");
    const body = sql.split("create function msrc_abstracts.word_count(body jsonb)")[1].split("$$;")[0];
    const sqlRange = body.match(/token ~ '(\[[^\n]*\])';/)?.[1];
    expect(sqlRange).toBeDefined(); expect(ABSTRACT_LETTER_OR_NUMBER.source).toBe(sqlRange);
    const sqlWhitespace = body.match(/U&'([^']+)'/)![1].match(/\\[0-9A-F]{4}/g)!.map((escape) => String.fromCodePoint(parseInt(escape.slice(1), 16)));
    for (const space of [..." \t\n\r\f\v", ...sqlWhitespace]) {
      expect(ABSTRACT_WHITESPACE.test(space)).toBe(true);
      expect(countAbstractWords({ background: `alpha${space}beta` })).toBe(2);
    }
    expect(ABSTRACT_WHITESPACE.test("\u0085")).toBe(false);
  });
  it("accepts 300 and refuses 301 words", () => {
    const body = { background: "w ".repeat(294), aim: "one", methods: "two", results: "three", conclusion: "four five six" };
    expect(countAbstractWords(body)).toBe(300); expect(abstractDocumentIssues({ ...abstractDocument, body }, abstractSettings)).not.toContain("word_limit");
    expect(abstractDocumentIssues({ ...abstractDocument, body: { ...body, background: body.background + "extra" } }, abstractSettings)).toContain("word_limit");
  });
  it("allows ongoing studies without invented results or a supervisor", () => expect(abstractDocumentIssues({ ...abstractDocument, body: { ...abstractDocument.body, results: "" } }, abstractSettings)).toEqual([]));
  it("does not count blank keywords or reject an explicitly configured zero count", () => {
    expect(abstractDocumentIssues({ ...abstractDocument, keywords: [""] }, abstractSettings)).toContain("keywords");
    expect(abstractDocumentIssues({ ...abstractDocument, keywords: [] }, { ...abstractSettings, keywordCount: 0 })).not.toContain("keywords");
    expect(abstractDocumentIssues({ ...abstractDocument, keywords: [""] }, { ...abstractSettings, keywordCount: 0 })).toContain("keywords");
  });
  it("supports many authors without a scientific cap", () => {
    const authors = Array.from({ length: 250 }, (_, index) => ({ ...abstractDocument.authors[0], id: `dc000000-0000-4000-8000-${index.toString().padStart(12, "0")}` }));
    expect(validateAbstractDocument({ ...abstractDocument, authors, piAuthorId: authors[0].id, correspondingAuthorId: authors[1].id })).not.toBeNull();
  });
  it("requires PI/corresponding emails but leaves other coauthor emails optional", () => {
    const coauthor = { ...abstractDocument.authors[0], id: "dc000000-0000-4000-8000-000000000002", email: "" };
    const document = { ...abstractDocument, authors: [...abstractDocument.authors, coauthor] };
    expect(abstractDocumentIssues(document, abstractSettings)).toEqual([]);
    expect(abstractDocumentIssues({ ...document, correspondingAuthorId: coauthor.id }, abstractSettings)).toContain("authors");
    expect(abstractDocumentIssues({ ...document, piAuthorId: coauthor.id }, abstractSettings)).toContain("authors");
    expect(abstractDocumentIssues({ ...document, authors: [...abstractDocument.authors, { ...coauthor, email: "invalid" }] }, abstractSettings)).toContain("authors");
  });
  it.each(["supervisor", "attachments", "submitterId", "reviewers", "confidentialEvidence"])("rejects uncontracted %s data", (key) => expect(validateAbstractDocument({ ...abstractDocument, [key]: "not accepted" })).toBeNull());
  it("requires each role to reference an explicit listed author", () => expect(validateAbstractDocument({ ...abstractDocument, piAuthorId: actorId })).toBeNull());
  it("refuses duplicated author IDs", () => expect(validateAbstractDocument({ ...abstractDocument, authors: [abstractDocument.authors[0], abstractDocument.authors[0]] })).toBeNull());
  it("does not invent settings for empty lists", () => expect(abstractSettingsProjection({ ...abstractSettings, specialties: [], studyTypes: [], keywordCount: null, correspondingAuthorPolicy: null, windowState: "not_ready" })).not.toBeNull());
  it("refuses overreturned internal review data", () => expect(abstractSubmissionProjection({ ...abstractSubmission, reviewerNames: ["private"] })).toBeNull());
  it("projects only published revision instructions and the exact deadline", () => {
    const decision = { outcome: "revise", instructions: "Synthetic revision", revisionDeadline: "2028-01-01T12:00:00Z", permittedFields: ["title", "body", "keywords"] };
    expect(abstractSubmissionProjection({ ...abstractSubmission, decision })?.decision).toEqual(decision);
    expect(abstractSubmissionProjection({ ...abstractSubmission, decision: { ...decision, confidentialReason: "private" } })).toBeNull();
    expect(abstractSubmissionProjection({ ...abstractSubmission, decision: { ...decision, revisionDeadline: null } })).toBeNull();
    expect(abstractSubmissionProjection({ ...abstractSubmission, decision: { ...decision, permittedFields: ["authors"] } })).toBeNull();
  });
});
describe("participant abstract API authorization and failures", () => {
  it("stays closed before constructing a backend", async () => { vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", ""); const f = fixture(); expect((await f.get()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalled(); });
  it("returns private authorized saved drafts", async () => { const response = await fixture().get(); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store"); expect((await response.json()).submissions).toHaveLength(1); });
  it("missing RPC retains sign-in", async () => { const response = await fixture({ error: new AbstractRpcMissingError() }).get(); expect(await response.json()).toEqual({ state: "area-not-ready" }); expect(response.headers.get("set-cookie")).toBeNull(); });
  it("rejects cross-account native identity", async () => { expect((await fixture({ identity: operationId }).get()).status).toBe(401); });
  it("rejects missing session", async () => { expect((await fixture().get({ cookie: "" })).status).toBe(401); });
  it("does not authorize user metadata", async () => { expect((await fixture({ claims: { ...claims, aal: "aal2", user_metadata: { role: "participant" } } }).get()).status).toBe(401); });
  it.each([{ origin: "https://attacker.invalid" }, { "sec-fetch-site": "cross-site" }])("rejects cross-origin mutations %#", async (headers) => expect((await fixture().post({}, headers)).status).toBe(400));
  it("rejects absent CSRF and client actor identifiers", async () => { expect((await fixture().post({ formToken: "" })).status).toBe(400); expect((await fixture().post({ actorId })).status).toBe(400); });
  it("rejects over-300 body server-side before any save", async () => { const f = fixture(); expect((await f.post({ document: { ...abstractDocument, body: { ...abstractDocument.body, background: "word ".repeat(301) } } })).status).toBe(400); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_save_draft", expect.anything()); });
  it("sends canonical session context and expected version to the save RPC", async () => { const f = fixture(); expect((await f.post()).status).toBe(200); expect(f.backend.rpc).toHaveBeenCalledWith("msrc_abstracts_save_draft", { edition_key: config.editionKey, session_claims: claims, submission_id: abstractSubmission.id, expected_version: 1, operation_id: operationId, document: abstractDocument }); });
  it.each(["conflict", "pi_limit", "evidence_gate", "invalid"])("preserves saved data and explains %s", async (outcome) => { const response = await fixture({ outcome }).post(); expect(response.status).toBe(409); expect((await response.json()).outcome).toBe(outcome); });
  it("maps a locked snapshot to a recoverable conflict", async () => { const response = await fixture({ outcome: "locked" }).post(); expect(response.status).toBe(409); expect((await response.json()).outcome).toBe("conflict"); });
  it("finalizes only the identified saved version without client scientific data", async () => {
    const f = fixture(), response = await f.post({ action: "finalize", document: undefined });
    expect(response.status).toBe(200); expect((await response.json()).outcome).toBe("finalized");
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_abstracts_finalize", { edition_key: config.editionKey, session_claims: claims, submission_id: abstractSubmission.id, expected_version: 1, operation_id: operationId });
  });
  it("refuses finalization with draft data or no saved identifier", async () => {
    expect((await fixture().post({ action: "finalize" })).status).toBe(400);
    expect((await fixture().post({ action: "finalize", document: undefined, submissionId: null })).status).toBe(400);
  });
  it("maps the independent database mutation budget to HTTP 429 without spending the auth form quota", async () => {
    const f = fixture({ outcome: "limited" }), response = await f.post();
    expect(response.status).toBe(429); expect(await response.json()).toEqual({ state: "limited" });
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_form_claim", expect.anything());
  });
  it("autosaving many drafts never consumes authentication admission attempts", async () => {
    const f = fixture(); for (let index = 0; index < 25; index++) expect((await f.post()).status).toBe(200);
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_participant_form_claim", expect.anything());
  });
  it("rechecks runtime gate after native identity verification", async () => { const f = fixture({ onIdentity: () => vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "") }); expect((await f.post()).status).toBe(503); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_save_draft", expect.anything()); });
  it("refuses private fields in read projections", async () => { const response = await fixture({ context: { state: "ready", settings: abstractSettings, submissions: [], confidentialNotes: "private" } }).get(); expect(await response.json()).toEqual({ state: "unavailable" }); });
  it("bounds JSON transport without a silent author cap", async () => { const request = new Request(origin, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ large: "a".repeat(256 * 1024) }) }); await expect(readAbstractJson(request)).rejects.toThrow(); });
  it("scopes CSRF to origin, actor and exact session", () => { const supplied = abstractFormToken(config, origin, actorId, sessionId, now); expect(readAbstractFormToken(config, supplied, origin, actorId, sessionId, now)).toBe(true); expect(readAbstractFormToken(config, supplied, origin, actorId, operationId, now)).toBe(false); expect(readAbstractFormToken(config, supplied, origin, actorId, sessionId, now + 30 * 60_000)).toBe(false); });
  it("recognizes only missing function responses as area-not-ready", async () => { vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 }))); await expect(createAbstractBackend(config).rpc("msrc_abstracts_me")).rejects.toBeInstanceOf(AbstractRpcMissingError); });
});
