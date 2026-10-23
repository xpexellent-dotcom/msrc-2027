import { ABSTRACT_BODY_KEYS, type AbstractDocument, type AbstractSettings, type AbstractSubmission, type AbstractStatus } from "./contracts";
import { ABSTRACT_LETTER_OR_NUMBER, ABSTRACT_WHITESPACE } from "./word-ranges";

export const ABSTRACT_PAYLOAD_BYTES = 256 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const abstractRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).sort().join(",") === expected.sort().join(",");
const text = (value: unknown): value is string => typeof value === "string" && !value.includes("\u0000");
const date = (value: unknown): value is string | null => value === null || typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));

/** ABS-04: interface headings, author information, title and keywords are excluded. */
export function countAbstractWords(body: Partial<Record<string, string>>): number {
  return ABSTRACT_BODY_KEYS.flatMap((key) => (body[key] ?? "").split(ABSTRACT_WHITESPACE)).filter((token) => ABSTRACT_LETTER_OR_NUMBER.test(token)).length;
}

/** Drafts may be incomplete. No scientific author limit is imposed; the transport has an explicit byte budget. */
export function validateAbstractDocument(value: unknown): AbstractDocument | null {
  const data = abstractRecord(value), body = abstractRecord(data?.body);
  if (!data || !keys(data, ["title", "specialtyId", "studyTypeId", "completionStatus", "body", "keywords", "authors", "piAuthorId", "correspondingAuthorId", "presentingAuthorId", "ethicsStatus", "ethicsExplanation", "conflictOfInterest", "fundingDeclaration", "authorityConfirmed"])
    || !["title", "specialtyId", "studyTypeId", "piAuthorId", "correspondingAuthorId", "ethicsExplanation", "conflictOfInterest", "fundingDeclaration"].every((key) => text(data[key]))
    || !["completed", "ongoing"].includes(String(data.completionStatus)) || !["approval_required", "exempt", "not_required"].includes(String(data.ethicsStatus))
    || !body || !keys(body, [...ABSTRACT_BODY_KEYS]) || !ABSTRACT_BODY_KEYS.every((key) => text(body[key]))
    || !Array.isArray(data.keywords) || !data.keywords.every(text) || !Array.isArray(data.authors) || typeof data.authorityConfirmed !== "boolean"
    || data.presentingAuthorId !== null && !text(data.presentingAuthorId)) return null;
  const authorIds = new Set<string>();
  for (const entry of data.authors) {
    const author = abstractRecord(entry);
    if (!author || !keys(author, ["id", "name", "email", "affiliations"]) || typeof author.id !== "string" || !uuid.test(author.id)
      || authorIds.has(author.id) || !text(author.name) || !text(author.email) || !Array.isArray(author.affiliations) || !author.affiliations.every(text)) return null;
    authorIds.add(author.id);
  }
  if (![data.piAuthorId, data.correspondingAuthorId, data.presentingAuthorId].every((id) => id === null || id === "" || authorIds.has(id as string))) return null;
  return data as AbstractDocument;
}

export function abstractDocumentIssues(document: AbstractDocument, settings: AbstractSettings): string[] {
  const issues: string[] = [];
  if (!document.title.trim()) issues.push("title");
  if (!settings.specialties.some((value) => value.id === document.specialtyId)) issues.push("specialty");
  if (!settings.studyTypes.some((value) => value.id === document.studyTypeId)) issues.push("study_type");
  if (countAbstractWords(document.body) > 300) issues.push("word_limit");
  // Ongoing work may explain unavailable results; no fabricated findings are required.
  if (!document.body.background.trim() || !document.body.aim.trim() || !document.body.methods.trim()
    || document.completionStatus === "completed" && !document.body.results.trim() || !document.body.conclusion.trim()) issues.push("body");
  if (!document.authors.length || document.authors.some((author) => !author.name.trim()
    || (author.email.trim() !== "" || author.id === document.piAuthorId || author.id === document.correspondingAuthorId) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)
    || !author.affiliations.length || author.affiliations.some((value) => !value.trim()))) issues.push("authors");
  if (!document.piAuthorId || !document.correspondingAuthorId) issues.push("author_roles");
  if (document.keywords.some((value) => !value.trim()) || settings.keywordCount !== null && document.keywords.length !== settings.keywordCount) issues.push("keywords");
  if (!document.ethicsExplanation.trim() || !document.conflictOfInterest.trim() || !document.fundingDeclaration.trim() || !document.authorityConfirmed) issues.push("declarations");
  return issues;
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
  const document = validateAbstractDocument(data.document);
  if (!document || countAbstractWords(document.body) !== data.wordCount) return null;
  const decision = abstractRecord(data.decision);
  if (data.decision !== null && (!decision || !keys(decision, ["outcome", "instructions", "revisionDeadline", "permittedFields"])
    || !["accept", "reject", "revise"].includes(String(decision.outcome)) || !text(decision.instructions) || !date(decision.revisionDeadline)
    || !Array.isArray(decision.permittedFields) || !decision.permittedFields.every((field) => ["title", "body", "keywords"].includes(String(field)))
    || decision.outcome === "revise" && decision.revisionDeadline === null)) return null;
  return { ...data, document } as AbstractSubmission;
}
