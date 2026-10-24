import { COMPETITION_KINDS, HACKATHON_TRACKS, type CompetitionDocument, type CompetitionEntry, type CompetitionKind, type CompetitionSettings, type HackathonProfile, type FinalistWorkspace } from "./contracts";
import { ABSTRACT_LETTER_OR_NUMBER, ABSTRACT_WHITESPACE } from "@/features/submissions/word-ranges";

export const COMPETITION_PAYLOAD_BYTES = 256 * 1024;
export const competitionUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const competitionRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const exactKeys = (data: Record<string, unknown>, expected: string[]) => Object.keys(data).sort().join(",") === [...expected].sort().join(",");
const text = (value: unknown): value is string => typeof value === "string" && !value.includes("\u0000");
export const isCompetitionKind = (value: unknown): value is CompetitionKind => COMPETITION_KINDS.includes(value as CompetitionKind);
/** HAC-04: same frozen Unicode token rule as the database; only the pitch counts. */
export function countPitchWords(pitch: string): number {
  return pitch.split(ABSTRACT_WHITESPACE).filter((token) => ABSTRACT_LETTER_OR_NUMBER.test(token)).length;
}
/** Drafts may be incomplete. The 3MT narrative has no invented 300-word limit. */
export function validateCompetitionDocument(kind: CompetitionKind, value: unknown): CompetitionDocument | null {
  const d = competitionRecord(value), declarations = competitionRecord(d?.declarations);
  const fields = kind === "hackathon" ? ["title", "pitch", "participationMode", "track", "references", "links", "declarations"] : ["title", "narrative", "presenter", "affiliation", "declarations"];
  const declarationKeys = kind === "hackathon" ? ["previouslyPresented", "competitionEntered", "prizeReceived", "fundingReceived", "commercialized", "historyDetails", "aiUsed", "aiTools", "teamContributions", "originalityPermissions", "rulesAcknowledged", "ethicsApplicable", "mediaNoticeAcknowledged", "authorityConfirmed"] : ["postgraduate", "authorityConfirmed"];
  const stringKeys = ["historyDetails", "aiTools", "teamContributions"];
  if (!d || !exactKeys(d, fields) || !declarations || !exactKeys(declarations, declarationKeys) || !declarationKeys.every((key) => kind === "hackathon" && stringKeys.includes(key) ? text(declarations[key]) : typeof declarations[key] === "boolean") || !text(d.title)) return null;
  if (kind === "hackathon") {
    if (!text(d.pitch) || countPitchWords(d.pitch) > 300 || !text(d.references) || !Array.isArray(d.links) || d.links.length > 10 || !d.links.every(validHackathonLink) || !["solo", "team"].includes(String(d.participationMode)) || !Object.hasOwn(HACKATHON_TRACKS, String(d.track))) return null;
  } else if (!["narrative", "presenter", "affiliation"].every((key) => text(d[key]))) return null;
  if (new TextEncoder().encode(JSON.stringify(d)).length > COMPETITION_PAYLOAD_BYTES) return null;
  return d as unknown as CompetitionDocument;
}
export function validHackathonLink(value: unknown): value is string {
  if (!text(value) || value.length > 2000) return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
export function hackathonProfileProjection(value: unknown): HackathonProfile | null {
  const d = competitionRecord(value); if (!d || !exactKeys(d, ["university", "fieldOfStudy", "phone", "enrolledInSaudiUniversity", ...["proofFileId", "proofState", "complete"].filter((key) => Object.hasOwn(d, key))]) || !["university", "fieldOfStudy", "phone"].every((key) => text(d[key]) && String(d[key]).length <= (key === "phone" ? 50 : 500)) || typeof d.enrolledInSaudiUniversity !== "boolean" || d.proofFileId !== undefined && d.proofFileId !== null && (typeof d.proofFileId !== "string" || !competitionUuid.test(d.proofFileId)) || d.proofState !== undefined && d.proofState !== null && !text(d.proofState) || d.complete !== undefined && typeof d.complete !== "boolean") return null;
  return d as unknown as HackathonProfile;
}
/** Contact details stay outside the anonymized project document. */
export function validateHackathonProfileInput(value: unknown): HackathonProfile | null {
  const profile = hackathonProfileProjection(value);
  if (!profile || !exactKeys(profile as unknown as Record<string, unknown>, ["university", "fieldOfStudy", "phone", "enrolledInSaudiUniversity"])
    || !profile.university.trim() || !profile.fieldOfStudy.trim() || !/^[+0-9() .-]{5,40}$/.test(profile.phone.trim())) return null;
  return { ...profile, university: profile.university.trim(), fieldOfStudy: profile.fieldOfStudy.trim(), phone: profile.phone.trim() };
}
export function finalistWorkspaceProjection(value: unknown): FinalistWorkspace | null {
  const d = competitionRecord(value), keys = ["orientationDetails", "timetable", "whatsappSupportUrl", "finalDeckLockAt", "participantInstructions", "confirmed"];
  if (!d || !exactKeys(d, keys) || !keys.filter((key) => key !== "confirmed").every((key) => d[key] === null || text(d[key])) || typeof d.confirmed !== "boolean" || d.whatsappSupportUrl !== null && !validHackathonLink(d.whatsappSupportUrl)) return null;
  return d as unknown as FinalistWorkspace;
}
export function competitionSettingsProjection(value: unknown): CompetitionSettings | null {
  const d = competitionRecord(value), stages = competitionRecord(d?.stageStates);
  if (!d || !exactKeys(d, ["stageStates", "pitchPrompt", "finalistCapPerTrack", "filesReady", ...["trackLabels", "trackDescriptions", "applicationDeadline"].filter((key) => Object.hasOwn(d, key))]) || typeof d.filesReady !== "boolean" || !stages || !exactKeys(stages, ["entry", "selection", "judging", "final_material", "membership"])
    || !Object.values(stages).every((v) => ["open", "closed", "not_ready"].includes(String(v)))
    || d.pitchPrompt !== null && !text(d.pitchPrompt) || d.finalistCapPerTrack !== null && (!Number.isSafeInteger(d.finalistCapPerTrack) || Number(d.finalistCapPerTrack) < 1)) return null;
  for (const key of ["trackLabels", "trackDescriptions"]) if (d[key] !== undefined && d[key] !== null) {
    const tracks = competitionRecord(d[key]); if (!tracks || !exactKeys(tracks, Object.keys(HACKATHON_TRACKS))) return null;
    for (const raw of Object.values(tracks)) { const label = competitionRecord(raw); if (!label || !exactKeys(label, ["en", "ar"]) || !text(label.en) || !text(label.ar)) return null; }
  }
  if (d.applicationDeadline !== undefined && d.applicationDeadline !== null && (!text(d.applicationDeadline) || !Number.isFinite(Date.parse(d.applicationDeadline)))) return null;
  return d as unknown as CompetitionSettings;
}
export function competitionEntryProjection(value: unknown): CompetitionEntry | null {
  const d = competitionRecord(value);
  if (!d || !exactKeys(d, ["id", "kind", "status", "version", "document", "roster", "files", "outcome", ...["finalistWorkspace", "isLead", "invitationAccepted"].filter((key) => Object.hasOwn(d, key))]) || !text(d.id) || !competitionUuid.test(d.id) || !isCompetitionKind(d.kind)
    || !["draft", "submitted", "review", "eligible", "ineligible", "in_review", "accepted", "rejected", "withdrawn", "final_material_received", "judged"].includes(String(d.status))
    || !Number.isSafeInteger(d.version) || Number(d.version) < 1 || !validateCompetitionDocument(d.kind, d.document) || !Array.isArray(d.roster) || !Array.isArray(d.files)
    || d.outcome !== null && !text(d.outcome)) return null;
  if (d.isLead !== undefined && typeof d.isLead !== "boolean") return null;
  if (d.invitationAccepted !== undefined && typeof d.invitationAccepted !== "boolean") return null;
  const rosterIds = new Set<string>();
  for (const raw of d.roster) { const row = competitionRecord(raw);
    if (!row || !exactKeys(row, ["id", "email", "isLead", "confirmed"]) || !text(row.id) || !competitionUuid.test(row.id) || rosterIds.has(row.id)
      || !text(row.email) || typeof row.isLead !== "boolean" || typeof row.confirmed !== "boolean") return null;
    rosterIds.add(row.id);
  }
  if (d.roster.length < 1 || d.roster.length > (d.kind === "hackathon" && (d.document as { participationMode: string }).participationMode === "team" ? 5 : 1)
    || d.roster.filter((r) => competitionRecord(r)?.isLead === true).length !== 1) return null;
  for (const raw of d.files) { const row = competitionRecord(raw);
    if (!row || !exactKeys(row, ["id", "name", "stage"]) || !text(row.id) || !competitionUuid.test(row.id) || !text(row.name) || !["supporting", "final"].includes(String(row.stage))) return null;
  }
  if (d.finalistWorkspace !== undefined && d.finalistWorkspace !== null && (d.kind !== "hackathon" || !["accepted", "final_material_received", "judged"].includes(String(d.status)) || !finalistWorkspaceProjection(d.finalistWorkspace))) return null;
  return d as unknown as CompetitionEntry;
}
