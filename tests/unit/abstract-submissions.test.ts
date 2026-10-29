import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolveParticipantConfig } from "@/features/participant-accounts/config.server";
import { participantCookie } from "@/features/participant-accounts/security.server";
import { AbstractRpcMissingError, createAbstractBackend, type AbstractBackend } from "@/features/submissions/backend.server";
import { createAbstractHandler } from "@/features/submissions/handler.server";
import { abstractFormToken, readAbstractFormToken, readAbstractJson } from "@/features/submissions/security.server";
import { abstractDocumentIssues, abstractDraftIssues, abstractSettingsProjection, abstractSubmissionProjection, blankAbstractDocument, countAbstractWords, countWords, presenterEligible, projectAbstractDocument, submissionChanceUsed, validateAbstractDocument } from "@/features/submissions/validation";
import { ABSTRACT_LETTER_OR_NUMBER, ABSTRACT_WHITESPACE } from "@/features/submissions/word-ranges";
import { ABSTRACT_BODY_KEYS } from "@/features/submissions/contracts";
import { ABSTRACT_SPECIALTIES, ABSTRACT_STUDY_TYPES } from "@/content/abstract-taxonomy";
import { PROFILE_STATUSES } from "@/features/participant-accounts/profile-contract";
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
function fixture(options: { error?: Error; profileComplete?: boolean; documentVersion?: number; presenterStatus?: string | null; windowState?: "open" | "closed" | "not_ready"; used?: boolean; identity?: string | null; context?: unknown; outcome?: string; claims?: unknown; onIdentity?: () => void } = {}) {
  const submission = { ...abstractSubmission, wordCount: countAbstractWords(abstractDocument.body), ...(options.used ? { status: "withdrawn" as const, finalizedAt: "2026-10-01T00:00:00Z" } : {}) };
  const presenter = { id: actorId, name: "Synthetic Profile Presenter", email: "profile-presenter@example.invalid", institution: "Synthetic Profile Institution", status: Object.hasOwn(options, "presenterStatus") ? options.presenterStatus! : "year_6" };
  const backend: AbstractBackend = { identity: vi.fn(async () => { options.onIdentity?.(); return Object.hasOwn(options, "identity") ? options.identity! : actorId; }), refresh: vi.fn(async () => null),
    rpc: vi.fn(async (name) => {
      if (name === "msrc_participant_status") return { enabled: true, ageEnforcementReady: true, retentionEnforcementReady: true, cleanupEnabled: true, privacyVersion: "synthetic-privacy-ci-v1", emailDailyLimit: 40 };
      if (name === "msrc_abstracts_status") return { enabled: true, settingsComplete: true, documentVersion: options.documentVersion ?? 2 };
      if (options.error) throw options.error;
      if (name === "msrc_participant_profile_complete") return { state: "ready", complete: options.profileComplete ?? true };
      if (name === "msrc_abstracts_me") return options.context ?? { state: "ready", settings: { ...abstractSettings, windowState: options.windowState ?? "open" }, presenter, submissions: [submission] };
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
describe("ORG-068 exact shared abstract and title counters", () => {
  it.each([
    ["alpha beta", 2], ["alpha-beta alpha / !!! 2027", 3], ["alpha\u00a0beta\u2003gamma\n delta", 4],
    ["\u0645\u0631\u062d\u0628\u0627 \u4e16\u754c caf\u00e9 \u0661\u0662\u0663", 4], ["\t-- \u2026  \ud83d\udc69\u200d\u2695\ufe0f", 0], ["A\ufeffB\vC\fD\rE", 5], ["", 0],
    ["\u2167 \u00bd \u00b2 \u{1e6c0} \u{31350} \u{1d49c}", 6], ["\u0301 \u200d \u0085 \u2014 \u2122 \ud83e\uddec", 0], ["alpha\u0085beta", 1],
  ])("counts %j as %d scientific words plus six headings", (value, total) => {
    expect(countWords(value)).toBe(total); expect(countAbstractWords({ background: value })).toBe(total + 6);
  });
  it("counts exactly six fixed headings and excludes all separate metadata", () => {
    expect(countAbstractWords({})).toBe(6);
    expect(countAbstractWords({ title: "extra title", keywords: "extra keywords", aim: "legacy", methods: "one" })).toBe(7);
  });
  it("pins identical Unicode letter/number and whitespace sets in TS and the v2 SQL counter", () => {
    const sql = readFileSync("supabase/migrations/20261029120000_abstract_submission_v2.sql", "utf8");
    const body = sql.split("function msrc_abstracts.word_count(body jsonb)")[1].split("$$;")[0];
    const sqlRange = body.match(/token ~ '(\[[^\n]*\])';/)?.[1];
    expect(sqlRange).toBeDefined(); expect(ABSTRACT_LETTER_OR_NUMBER.source).toBe(sqlRange); expect(body).toMatch(/select 6\s*\+\s*count/);
    const sqlWhitespace = body.match(/U&'([^']+)'/)![1].match(/\\[0-9A-F]{4}/g)!.map((escape) => String.fromCodePoint(parseInt(escape.slice(1), 16)));
    for (const space of [..." \t\n\r\f\v", ...sqlWhitespace]) {
      expect(ABSTRACT_WHITESPACE.test(space)).toBe(true); expect(countAbstractWords({ background: `alpha${space}beta` })).toBe(8);
    }
    expect(ABSTRACT_WHITESPACE.test("\u0085")).toBe(false);
  });
  it("accepts exactly 350 including headings and refuses 351 even in a draft", () => {
    const body = { background: "w ".repeat(339), objectives: "one", methods: "two", results: "three", limitations: "four", conclusion: "five" };
    expect(countAbstractWords(body)).toBe(350); expect(abstractDocumentIssues({ ...abstractDocument, body })).not.toContain("word_limit");
    expect(abstractDraftIssues({ ...abstractDocument, body: { ...body, background: body.background + "extra" } })).toContain("word_limit");
  });
  it("limits title to 20 using the same Unicode and hyphen rules", () => {
    expect(abstractDraftIssues({ ...abstractDocument, title: "alpha-beta ".repeat(20) })).toEqual([]);
    expect(abstractDraftIssues({ ...abstractDocument, title: "alpha-beta ".repeat(21) })).toContain("title_limit");
    expect(abstractDocumentIssues({ ...abstractDocument, title: " " })).toContain("title");
  });
});
describe("ORG-068 structured v2 fields and fixed taxonomy", () => {
  it("allows incomplete drafts but requires a complete final document", () => {
    expect(validateAbstractDocument(blankAbstractDocument())).not.toBeNull(); expect(abstractDraftIssues(blankAbstractDocument())).toEqual([]);
    expect(abstractDocumentIssues(abstractDocument)).toEqual([]); expect(abstractDocumentIssues(blankAbstractDocument())).toContain("body");
  });
  it.each(ABSTRACT_BODY_KEYS)("requires a real word in %s including results and limitations", (key) => {
    for (const value of ["", "  ", "-- !!!"]) expect(abstractDocumentIssues({ ...abstractDocument, body: { ...abstractDocument.body, [key]: value } })).toContain("body");
  });
  it("requires completed analysis and written-manuscript confirmation", () => expect(abstractDocumentIssues({ ...abstractDocument, analysisComplete: false })).toContain("analysis_complete"));
  it("uses the owner-approved choices independently from legacy/profile settings", () => {
    expect(ABSTRACT_SPECIALTIES).toHaveLength(21); expect(ABSTRACT_STUDY_TYPES).toHaveLength(10);
    for (const specialty of ABSTRACT_SPECIALTIES) expect(abstractDocumentIssues({ ...abstractDocument, specialtyId: specialty.id }, { ...abstractSettings, specialties: [] })).not.toContain("specialty");
    for (const study of ABSTRACT_STUDY_TYPES) expect(abstractDocumentIssues({ ...abstractDocument, studyTypeId: study.id, studyTypeOther: "Synthetic design" }, { ...abstractSettings, studyTypes: [] })).not.toContain("study_type");
    for (const specialtyId of ["", "other", "synthetic-specialty"]) expect(abstractDocumentIssues({ ...abstractDocument, specialtyId })).toContain("specialty");
    for (const studyTypeId of ["", "synthetic-study"]) expect(abstractDocumentIssues({ ...abstractDocument, studyTypeId })).toContain("study_type");
    expect(abstractDocumentIssues({ ...abstractDocument, studyTypeId: "other", studyTypeOther: "" })).toContain("study_type_other");
    expect(abstractDraftIssues({ ...abstractDocument, studyTypeOther: "s".repeat(80) })).not.toContain("study_type_other");
    expect(abstractDraftIssues({ ...abstractDocument, studyTypeOther: "s".repeat(81) })).toContain("study_type_other");
  });
  it("supports many authors without a scientific cap and optional co-author emails", () => {
    const coauthor = { ...abstractDocument.authors[0], id: "dc000000-0000-4000-8000-000000000002", email: "" };
    expect(abstractDocumentIssues({ ...abstractDocument, authors: [...abstractDocument.authors, coauthor] })).toEqual([]);
    for (const patch of [{ name: "" }, { affiliations: [] }, { affiliations: [""] }, { email: "invalid" }]) expect(abstractDocumentIssues({ ...abstractDocument, authors: [...abstractDocument.authors, { ...coauthor, ...patch }] })).toContain("authors");
    const authors = Array.from({ length: 250 }, (_, index) => ({ ...abstractDocument.authors[0], id: `dc000000-0000-4000-8000-${index.toString().padStart(12, "0")}` }));
    expect(validateAbstractDocument({ ...abstractDocument, authors, presentingAuthorId: authors[0].id })).not.toBeNull();
    expect(abstractDocumentIssues({ ...abstractDocument, presentingAuthorId: null })).toContain("presenter");
    expect(abstractDocumentIssues({ ...abstractDocument, authors: [{ ...abstractDocument.authors[0], email: "" }] })).toContain("presenter");
  });
  it.each([{ fullName: "" }, { email: "" }, { email: "invalid" }, { phone: "" }, { phone: "0551234567" }, { phone: "+966 551234567" }, { phone: "+01234567" }])("requires valid private supervisor contacts: %j", (patch) => expect(abstractDocumentIssues({ ...abstractDocument, supervisor: { ...abstractDocument.supervisor, ...patch } })).toContain("supervisor"));
  it("requires ethics details specific to the declared status", () => {
    const ethics = { status: "approved" as const, committee: "Synthetic IRB", reference: "SYN-123", explanation: "" };
    expect(abstractDocumentIssues({ ...abstractDocument, ethics })).not.toContain("ethics");
    for (const patch of [{ committee: "" }, { reference: "" }]) expect(abstractDocumentIssues({ ...abstractDocument, ethics: { ...ethics, ...patch } })).toContain("ethics");
    expect(abstractDocumentIssues({ ...abstractDocument, ethics: { ...ethics, status: "exempt", committee: "", reference: "SYN-EXEMPT" } })).not.toContain("ethics");
    expect(abstractDocumentIssues({ ...abstractDocument, ethics: { ...ethics, status: "exempt", reference: "", explanation: "Synthetic exemption basis" } })).not.toContain("ethics");
    for (const status of ["exempt", "not_required"] as const) expect(abstractDocumentIssues({ ...abstractDocument, ethics: { status, committee: "", reference: "", explanation: "" } })).toContain("ethics");
    expect(abstractDocumentIssues({ ...abstractDocument, ethics: { status: "not_required", committee: "", reference: "", explanation: "No human participants or data" } })).not.toContain("ethics");
  });
  it("requires registration details only when registered", () => {
    const registration = { status: "registered" as const, registry: "Synthetic registry", number: "SYN-123" };
    expect(abstractDocumentIssues({ ...abstractDocument, registration })).not.toContain("registration");
    for (const patch of [{ registry: "" }, { number: "" }]) expect(abstractDocumentIssues({ ...abstractDocument, registration: { ...registration, ...patch } })).toContain("registration");
    expect(abstractDocumentIssues({ ...abstractDocument, registration: { status: "not_applicable", registry: "", number: "" } })).not.toContain("registration");
  });
  it.each(["authorityConfirmed", "englishConfirmed", "integrityConfirmed", "singlePresenterConfirmed", "oneSubmissionConfirmed"] as const)("requires %s", (key) => expect(abstractDocumentIssues({ ...abstractDocument, [key]: false })).toContain("declarations"));
  it.each(["conflictOfInterest", "fundingDeclaration"] as const)("requires %s declaration", (key) => expect(abstractDocumentIssues({ ...abstractDocument, [key]: " " })).toContain("declarations"));
  it.each(Object.keys(abstractDocument))("rejects missing or mistyped %s transport", (key) => {
    const without = { ...abstractDocument } as Record<string, unknown>; delete without[key]; expect(validateAbstractDocument(without)).toBeNull();
    expect(validateAbstractDocument({ ...abstractDocument, [key]: 42 })).toBeNull();
  });
  it.each(["keywords", "piAuthorId", "correspondingAuthorId", "completionStatus", "attachments", "submitterId", "reviewers", "confidentialEvidence"])("rejects removed or uncontracted %s", (key) => expect(validateAbstractDocument({ ...abstractDocument, [key]: "not accepted" })).toBeNull());
  it("rejects nested extra fields and duplicated or unknown author identifiers", () => {
    for (const key of ["body", "supervisor", "ethics", "registration"] as const) expect(validateAbstractDocument({ ...abstractDocument, [key]: { ...abstractDocument[key], private: "extra" } })).toBeNull();
    expect(validateAbstractDocument({ ...abstractDocument, authors: [abstractDocument.authors[0], abstractDocument.authors[0]] })).toBeNull();
    expect(validateAbstractDocument({ ...abstractDocument, presentingAuthorId: actorId })).toBeNull();
  });
  it("keeps empty staff settings valid and profile interests independent", () => expect(abstractSettingsProjection({ ...abstractSettings, specialties: [], studyTypes: [], keywordCount: null, correspondingAuthorPolicy: null, windowState: "not_ready" })).not.toBeNull());
  it("refuses overreturned internal review data", () => expect(abstractSubmissionProjection({ ...abstractSubmission, reviewerNames: ["private"] })).toBeNull());
  it("projects only published legacy revision instructions and exact deadlines", () => {
    const decision = { outcome: "revise", instructions: "Synthetic revision", revisionDeadline: "2028-01-01T12:00:00Z", permittedFields: ["title", "body", "keywords"] };
    expect(abstractSubmissionProjection({ ...abstractSubmission, decision })?.decision).toEqual(decision);
    for (const patch of [{ confidentialReason: "private" }, { revisionDeadline: null }, { permittedFields: ["authors"] }]) expect(abstractSubmissionProjection({ ...abstractSubmission, decision: { ...decision, ...patch } })).toBeNull();
  });
  it("reads legacy finalized snapshots without rewriting or inventing new confirmations", () => {
    const document = { title: "Historical study", specialtyId: "legacy-specialty", studyTypeId: "legacy-study", completionStatus: "completed", body: { background: "Background", aim: "Aim", methods: "Methods", results: "Results", conclusion: "Conclusion" }, authors: abstractDocument.authors, piAuthorId: abstractDocument.authors[0].id, correspondingAuthorId: abstractDocument.authors[0].id, presentingAuthorId: abstractDocument.presentingAuthorId, keywords: ["legacy"], ethicsStatus: "exempt", ethicsExplanation: "Historical explanation", conflictOfInterest: "None", fundingDeclaration: "None", authorityConfirmed: true }, original = structuredClone(document);
    expect(validateAbstractDocument(document)).toBeNull(); expect(projectAbstractDocument(document)).toMatchObject({ body: { objectives: "Aim", limitations: "" }, analysisComplete: false, englishConfirmed: false });
    expect(abstractSubmissionProjection({ ...abstractSubmission, document, status: "submitted", finalizedAt: "2026-01-01T00:00:00Z", wordCount: 5 })).toMatchObject({ wordCount: 11 }); expect(document).toEqual(original);
    expect(abstractSubmissionProjection({ ...abstractSubmission, document, wordCount: 4 })).toBeNull();
  });
});
describe("ORG-068 presenter eligibility and one-chance state", () => {
  it.each(PROFILE_STATUSES)("maps completed profile status %s", (status) => expect(presenterEligible(status)).toBe(!["postgraduate", "residency", "faculty"].includes(status)));
  it.each([null, undefined, "", "student", "Year_1", 1])("refuses unknown status %j", (status) => expect(presenterEligible(status)).toBe(false));
  it("uses only drafts as unspent and retains the chance after withdrawal/rejection", () => {
    expect(submissionChanceUsed([])).toBe(false); expect(submissionChanceUsed([{ status: "draft", finalizedAt: null }])).toBe(false);
    for (const status of ["submitted", "rejected", "withdrawn", "revision_requested", "accepted"] as const) expect(submissionChanceUsed([{ status, finalizedAt: "2026-01-01T00:00:00Z" }])).toBe(true);
    expect(submissionChanceUsed([{ status: "withdrawn", finalizedAt: null }])).toBe(false);
    expect(submissionChanceUsed([{ status: "draft", finalizedAt: "2026-01-01T00:00:00Z" }])).toBe(true);
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
  it("rejects over-350 body server-side before any save", async () => { const f = fixture(); expect((await f.post({ document: { ...abstractDocument, body: { ...abstractDocument.body, background: "word ".repeat(351) } } })).status).toBe(400); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_save_draft", expect.anything()); });
  it("sends canonical session context and expected version to the save RPC", async () => { const f = fixture(); expect((await f.post()).status).toBe(200); expect(f.backend.rpc).toHaveBeenCalledWith("msrc_abstracts_save_draft", { edition_key: config.editionKey, session_claims: claims, submission_id: abstractSubmission.id, expected_version: 1, operation_id: operationId, document: { ...abstractDocument, presentingAuthorId: actorId, authors: [{ id: actorId, name: "Synthetic Profile Presenter", email: "profile-presenter@example.invalid", affiliations: ["Synthetic Profile Institution"] }] } }); });
  it.each(["conflict", "evidence_gate", "invalid"])("preserves saved data and explains %s", async (outcome) => { const response = await fixture({ outcome }).post(); expect(response.status).toBe(409); expect((await response.json()).outcome).toBe(outcome); });
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
  it("refuses private fields in read projections", async () => { const response = await fixture({ context: { state: "ready", settings: abstractSettings, presenter: { id: actorId, name: "Synthetic Presenter", email: "presenter@example.invalid", institution: "Synthetic Institution", status: "year_6" }, submissions: [], confidentialNotes: "private" } }).get(); expect(await response.json()).toEqual({ state: "unavailable" }); });
  it("bounds JSON transport without a silent author cap", async () => { const request = new Request(origin, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ large: "a".repeat(256 * 1024) }) }); await expect(readAbstractJson(request)).rejects.toThrow(); });
  it("scopes CSRF to origin, actor and exact session", () => { const supplied = abstractFormToken(config, origin, actorId, sessionId, now); expect(readAbstractFormToken(config, supplied, origin, actorId, sessionId, now)).toBe(true); expect(readAbstractFormToken(config, supplied, origin, actorId, operationId, now)).toBe(false); expect(readAbstractFormToken(config, supplied, origin, actorId, sessionId, now + 30 * 60_000)).toBe(false); });
  it("recognizes only missing function responses as area-not-ready", async () => { vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 }))); await expect(createAbstractBackend(config).rpc("msrc_abstracts_me")).rejects.toBeInstanceOf(AbstractRpcMissingError); });
});

describe("ENG-087 abstract profile submission gate", () => {
  it("returns only the presenter's approved identity fields if a backend overreturns profile data", async () => {
    const presenter = { id: actorId, name: "Synthetic Presenter", email: "presenter@example.invalid", institution: "Synthetic Institution", status: "year_6" };
    const f = fixture({ context: { state: "ready", settings: abstractSettings, submissions: [abstractSubmission], presenter: { ...presenter, identityNumber: "synthetic-private-canary", dateOfBirth: "2000-01-01" } } });
    const response = await f.get();
    expect(response.status).toBe(200);
    const value = await response.json();
    expect(value.presenter).toEqual(presenter);
    expect(JSON.stringify(value)).not.toContain("synthetic-private-canary");
    expect(value.presenter).not.toHaveProperty("dateOfBirth");
  });
  it.each([
    [{ windowState: "closed", profileComplete: false, presenterStatus: "faculty", used: true }, "closed"],
    [{ profileComplete: false, presenterStatus: "faculty", used: true }, "profile_incomplete"],
    [{ presenterStatus: "faculty", used: true }, "presenter_ineligible"],
  ] as const)("checks the ordered finalization gates: %j", async (options, state) => {
    const f = fixture(options), response = await f.post({ action: "finalize", document: undefined });
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ state });
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_finalize", expect.anything());
  });
  it.each(["presenter_ineligible", "submission_used"])("preserves the atomic DB gate %s", async (outcome) => {
    const response = await fixture({ outcome }).post({ action: "finalize", document: undefined });
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ state: outcome });
  });
  it("allows the database to replay the same finalize operation after the chance is used", async () => {
    const f = fixture({ used: true }), originalRpc = vi.mocked(f.backend.rpc).getMockImplementation()!;
    vi.mocked(f.backend.rpc).mockImplementation(async (name, args) => name === "msrc_abstracts_finalize"
      ? { state: args?.operation_id === operationId ? "finalized" : "submission_used" }
      : originalRpc(name, args));
    const replay = await f.post({ action: "finalize", document: undefined });
    expect(replay.status).toBe(200); expect((await replay.json()).outcome).toBe("finalized");
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_abstracts_finalize", expect.objectContaining({ operation_id: operationId }));
    const anotherOperation = "df000000-0000-4000-8000-000000000002";
    const fresh = await f.post({ action: "finalize", document: undefined, operationId: anotherOperation });
    expect(fresh.status).toBe(409); expect(await fresh.json()).toEqual({ state: "submission_used" });
    expect(f.backend.rpc).toHaveBeenCalledWith("msrc_abstracts_finalize", expect.objectContaining({ operation_id: anotherOperation }));
  });
  it("deploys safely ahead of the hosted v2 migration", async () => {
    const f = fixture({ documentVersion: 1 }), response = await f.get();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "area-not-ready" });
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_me", expect.anything());
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it.each([{ title: "word ".repeat(21) }, { specialtyId: "unconfigured" }, { studyTypeId: "unconfigured" }, { studyTypeOther: "x".repeat(81) }])("rejects invalid draft fields before persistence: %j", async (patch) => {
    const f = fixture(), response = await f.post({ document: { ...abstractDocument, ...patch } });
    expect(response.status).toBe(400); expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_save_draft", expect.anything());
  });
  it("allows drafts while incomplete, refuses finalization before mutation", async () => {
    const f = fixture({ profileComplete: false });
    expect((await f.post()).status).toBe(200);
    const response = await f.post({ action: "finalize", document: undefined });
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ state: "profile_incomplete" });
    expect(f.backend.rpc).not.toHaveBeenCalledWith("msrc_abstracts_finalize", expect.anything());
    expect((await (await f.get()).json()).profileComplete).toBe(false);
  });
  it("preserves the distinct atomic database rejection", async () => {
    const response = await fixture({ outcome: "profile_incomplete" }).post({ action: "finalize", document: undefined });
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ state: "profile_incomplete" });
  });
});
