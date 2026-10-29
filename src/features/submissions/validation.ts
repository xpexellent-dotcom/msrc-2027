import { ABSTRACT_SPECIALTIES, ABSTRACT_STUDY_TYPES } from "@/content/abstract-taxonomy";
import { isProfilePhone } from "@/features/participant-accounts/profile-contract";
import { ABSTRACT_BODY_KEYS, type AbstractDocument, type AbstractSettings, type AbstractSubmission, type AbstractStatus } from "./contracts";
import { ABSTRACT_LETTER_OR_NUMBER, ABSTRACT_WHITESPACE } from "./word-ranges";

export const ABSTRACT_PAYLOAD_BYTES = 256 * 1024;
export const ABSTRACT_WORD_LIMIT = 350;
export const ABSTRACT_TITLE_WORD_LIMIT = 20;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const abstractRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).sort().join(",") === [...expected].sort().join(",");
const text = (value: unknown): value is string => typeof value === "string" && !value.includes("\u0000");
const date = (value: unknown): value is string | null => value === null || typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const email = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function countWords(value: string): number { return value.split(ABSTRACT_WHITESPACE).filter((token) => ABSTRACT_LETTER_OR_NUMBER.test(token)).length; }
/** ORG-068: all six fixed headings count, including in an otherwise empty draft. */
export function countAbstractWords(body: Partial<Record<string, string>>): number {
  return ABSTRACT_BODY_KEYS.length + ABSTRACT_BODY_KEYS.reduce((total, key) => total + countWords(body[key] ?? ""), 0);
}
export function presenterEligible(status: unknown): boolean {
  return ["year_1", "year_2", "year_3", "year_4", "year_5", "year_6", "internship", "clinical_placement"].includes(String(status));
}
export function submissionChanceUsed(submissions: Pick<AbstractSubmission, "status" | "finalizedAt">[]): boolean {
  return submissions.some((row) => row.finalizedAt !== null);
}
export function blankAbstractDocument(): AbstractDocument {
  return { title: "", specialtyId: "", studyTypeId: "", studyTypeOther: "", analysisComplete: false,
    body: { background: "", objectives: "", methods: "", results: "", limitations: "", conclusion: "" }, authors: [], presentingAuthorId: null,
    supervisor: { fullName: "", email: "", phone: "" }, ethics: { status: "approved", committee: "", reference: "", explanation: "" },
    registration: { status: "not_applicable", registry: "", number: "" }, conflictOfInterest: "", fundingDeclaration: "", authorityConfirmed: false,
    englishConfirmed: false, integrityConfirmed: false, singlePresenterConfirmed: false, oneSubmissionConfirmed: false };
}
/** Drafts may be incomplete. Strict v2 transport; no arbitrary scientific author limit. */
export function validateAbstractDocument(value: unknown): AbstractDocument | null {
  const data = abstractRecord(value), body = abstractRecord(data?.body), supervisor = abstractRecord(data?.supervisor), ethics = abstractRecord(data?.ethics), registration = abstractRecord(data?.registration);
  if (!data || !keys(data, Object.keys(blankAbstractDocument()))
    || !["title", "specialtyId", "studyTypeId", "studyTypeOther", "conflictOfInterest", "fundingDeclaration"].every((key) => text(data[key]))
    || !["analysisComplete", "authorityConfirmed", "englishConfirmed", "integrityConfirmed", "singlePresenterConfirmed", "oneSubmissionConfirmed"].every((key) => typeof data[key] === "boolean")
    || !body || !keys(body, [...ABSTRACT_BODY_KEYS]) || !ABSTRACT_BODY_KEYS.every((key) => text(body[key]))
    || !supervisor || !keys(supervisor, ["fullName", "email", "phone"]) || !Object.values(supervisor).every(text)
    || !ethics || !keys(ethics, ["status", "committee", "reference", "explanation"]) || !Object.values(ethics).every(text) || !["approved", "exempt", "not_required"].includes(String(ethics.status))
    || !registration || !keys(registration, ["status", "registry", "number"]) || !Object.values(registration).every(text) || !["registered", "not_applicable"].includes(String(registration.status))
    || !Array.isArray(data.authors) || data.presentingAuthorId !== null && !text(data.presentingAuthorId)) return null;
  const authorIds = new Set<string>();
  for (const entry of data.authors) {
    const author = abstractRecord(entry);
    if (!author || !keys(author, ["id", "name", "email", "affiliations"]) || typeof author.id !== "string" || !uuid.test(author.id)
      || authorIds.has(author.id) || !text(author.name) || !text(author.email) || !Array.isArray(author.affiliations) || !author.affiliations.every(text)) return null;
    authorIds.add(author.id);
  }
  if (data.presentingAuthorId !== null && data.presentingAuthorId !== "" && !authorIds.has(data.presentingAuthorId as string)) return null;
  return data as AbstractDocument;
}
/** Projection only: legacy immutable documents are never rewritten or accepted as new saves. */
export function projectAbstractDocument(value: unknown): AbstractDocument | null {
  const current = validateAbstractDocument(value); if (current) return current;
  const data = abstractRecord(value), body = abstractRecord(data?.body);
  if (!data || !body || !["background", "aim", "methods", "results", "conclusion"].every((key) => text(body[key]))
    || !["completed", "ongoing"].includes(String(data.completionStatus)) || !Array.isArray(data.authors)) return null;
  const projected = { ...blankAbstractDocument(), title: data.title, specialtyId: data.specialtyId, studyTypeId: data.studyTypeId,
    body: { background: body.background, objectives: body.aim, methods: body.methods, results: body.results, limitations: "", conclusion: body.conclusion },
    authors: data.authors, presentingAuthorId: data.presentingAuthorId ?? null,
    ethics: { status: data.ethicsStatus === "approval_required" ? "approved" : data.ethicsStatus, committee: "", reference: "", explanation: data.ethicsExplanation },
    conflictOfInterest: data.conflictOfInterest, fundingDeclaration: data.fundingDeclaration, authorityConfirmed: data.authorityConfirmed };
  return validateAbstractDocument(projected);
}
export function abstractDraftIssues(document: AbstractDocument): string[] {
  const issues: string[] = [];
  if (countWords(document.title) > ABSTRACT_TITLE_WORD_LIMIT) issues.push("title_limit");
  if (document.studyTypeOther.length > 80) issues.push("study_type_other");
  if (document.specialtyId && !ABSTRACT_SPECIALTIES.some((value) => value.id === document.specialtyId)) issues.push("specialty");
  if (document.studyTypeId && !ABSTRACT_STUDY_TYPES.some((value) => value.id === document.studyTypeId)) issues.push("study_type");
  if (countAbstractWords(document.body) > ABSTRACT_WORD_LIMIT) issues.push("word_limit");
  return issues;
}
export function abstractDocumentIssues(document: AbstractDocument, _settings?: AbstractSettings): string[] {
  // Retain the call signature for incumbent readers; choices now come from ORG-068.
  void _settings;
  const issues = abstractDraftIssues(document);
  if (!document.title.trim()) issues.push("title");
  if (!document.specialtyId) issues.push("specialty");
  if (!document.studyTypeId) issues.push("study_type");
  if (document.studyTypeId === "other" && !document.studyTypeOther.trim()) issues.push("study_type_other");
  if (!document.analysisComplete) issues.push("analysis_complete");
  if (!ABSTRACT_BODY_KEYS.every((key) => countWords(document.body[key]) > 0)) issues.push("body");
  if (!document.authors.length || document.authors.some((author) => !author.name.trim() || author.email.trim() !== "" && !email(author.email)
    || !author.affiliations.length || author.affiliations.some((value) => !value.trim()))) issues.push("authors");
  const presenter = document.authors.find((author) => author.id === document.presentingAuthorId);
  if (!presenter || !email(presenter.email)) issues.push("presenter");
  if (!document.supervisor.fullName.trim() || !email(document.supervisor.email) || !isProfilePhone(document.supervisor.phone)) issues.push("supervisor");
  if (document.ethics.status === "approved" && (!document.ethics.committee.trim() || !document.ethics.reference.trim())
    || document.ethics.status === "exempt" && !document.ethics.reference.trim() && !document.ethics.explanation.trim()
    || document.ethics.status === "not_required" && !document.ethics.explanation.trim()) issues.push("ethics");
  if (document.registration.status === "registered" && (!document.registration.registry.trim() || !document.registration.number.trim())) issues.push("registration");
  if (!document.conflictOfInterest.trim() || !document.fundingDeclaration.trim()
    || !document.authorityConfirmed || !document.englishConfirmed || !document.integrityConfirmed || !document.singlePresenterConfirmed || !document.oneSubmissionConfirmed) issues.push("declarations");
  return [...new Set(issues)];
}

export function abstractSettingsProjection(value: unknown): AbstractSettings | null {
  const data = abstractRecord(value);
  if (!data || !keys(data, ["specialties", "studyTypes", "keywordCount", "windowState", "opensAt", "closesAt", "correspondingAuthorPolicy"])
    || !Array.isArray(data.specialties) || !Array.isArray(data.studyTypes) || !["open", "closed", "not_ready"].includes(String(data.windowState))
    || data.keywordCount !== null && (!Number.isSafeInteger(data.keywordCount) || Number(data.keywordCount) < 0)
    || !date(data.opensAt) || !date(data.closesAt) || data.correspondingAuthorPolicy !== null && !text(data.correspondingAuthorPolicy)) return null;
  for (const [items, type] of [[data.specialties, false], [data.studyTypes, true]] as const) {
    const ids = new Set<string>();
    for (const entry of items) {
      const option = abstractRecord(entry);
      if (!option || !keys(option, type ? ["id", "label", "template"] : ["id", "label"]) || !text(option.id) || !option.id || ids.has(option.id)
        || !text(option.label) || !option.label || type && !["research", "case_report"].includes(String(option.template))) return null;
      ids.add(option.id);
    }
  }
  return data as AbstractSettings;
}

export function abstractSubmissionProjection(value: unknown): AbstractSubmission | null {
  const data = abstractRecord(value);
  const statuses: AbstractStatus[] = ["draft", "submitted", "administrative_review", "scientific_review", "revision_requested", "conditionally_accepted", "accepted", "rejected", "withdrawn", "revision_expired", "final_material_received"];
  if (!data || !keys(data, ["id", "reference", "status", "version", "document", "wordCount", "finalizedAt", "decision"]) || typeof data.id !== "string" || !uuid.test(data.id)
    || data.reference !== null && !text(data.reference) || !statuses.includes(data.status as AbstractStatus) || !Number.isSafeInteger(data.version) || Number(data.version) < 1
    || !date(data.finalizedAt) || !Number.isSafeInteger(data.wordCount) || Number(data.wordCount) < 0) return null;
  const document = projectAbstractDocument(data.document);
  const legacy = abstractRecord(data.document)?.completionStatus !== undefined;
  if (!document || countAbstractWords(document.body) !== data.wordCount && !(legacy && countAbstractWords(document.body) - 6 === data.wordCount)) return null;
  const decision = abstractRecord(data.decision);
  if (data.decision !== null && (!decision || !keys(decision, ["outcome", "instructions", "revisionDeadline", "permittedFields"])
    || !["accept", "reject", "revise"].includes(String(decision.outcome)) || !text(decision.instructions) || !date(decision.revisionDeadline)
    || !Array.isArray(decision.permittedFields) || !decision.permittedFields.every((field) => ["title", "body", "keywords"].includes(String(field)))
    || decision.outcome === "revise" && decision.revisionDeadline === null)) return null;
  return { ...data, document, wordCount: countAbstractWords(document.body) } as AbstractSubmission;
}
