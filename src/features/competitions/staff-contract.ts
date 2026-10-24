import type { CompetitionKind, HackathonDocument } from "./contracts";

export type CompetitionScalePoint = { score: number; label: string; description: string };
export type CompetitionCriterion = { id: string; label: string; min: number; max: number; questions?: string[]; scale?: CompetitionScalePoint[]; anchors?: { score: number; description: string }[]; rubricVersion?: string };
export type CompetitionPacket = { title: string; pitch: string; narrative: string; track: string | null; references?: string; links?: string[] };
export type CompetitionScorecard = { scores: { criterionId: string; value: number }[]; comments: string };
export type HackathonStaffApplication = Pick<HackathonDocument, "references" | "links" | "declarations">;
export type CompetitionAssignment = { id: string; entryId: string; version: number; status: string; title: string; packet: CompetitionPacket | null; rubric: CompetitionCriterion[] | null; scorecard: CompetitionScorecard | null; files?: { id: string; name: string }[] };
export type StaffCompetitionEntry = { id: string; kind: CompetitionKind; version: number; status: string; title: string; track: string | null; eligibility: string; assignedCount: number | null; completedCount: number | null; sourceText: string; application?: HackathonStaffApplication; roster: { id: string; memberId?: string; email: string; isLead: boolean; confirmed: boolean; profile?: HackathonEligibilityProfile | null }[]; framework?: HackathonFrameworkStatus; files: { id: string; name: string; stage: string }[]; outcome: string | null; decision: null | { id: string; outcome: string; rank: number | null; tieResolution: string | null; reason: string; published: boolean }; reviewBasis?: { assignmentId: string; version: number; settingsVersion: number; scorecard: CompetitionScorecard; rubric: CompetitionCriterion[] }[] };
export type HackathonTrackSettings = Record<"translating_research" | "advancing_research", { en: string; ar: string }>;
export type HackathonEligibilityProfile = { university: string; fieldOfStudy: string; phone: string; enrolledInSaudiUniversity: boolean; proofFileId: string | null; proofState: string | null; complete: boolean };
export type HackathonFrameworkStatus = { integrityFlag: boolean; committeeCleared: boolean; thirdReviewRequired: boolean; screeningAverage: number | null; reserveRank: number | null; finalistConfirmed: boolean };
export type SettingValue = null | string | number | boolean | CompetitionCriterion[] | string[] | Record<string, number | null> | HackathonTrackSettings;
export const HACKATHON_FRAMEWORK_SETTING_KEYS = ["thirdReviewDifference", "trackLabels", "trackDescriptions", "orientationDetails", "timetable", "whatsappSupportUrl", "finalDeckLockAt", "participantInstructions", "rosterConfirmationDeadline"] as const;
export const COMPETITION_SETTING_KEYS = ["opensAt", "closesAt", "reviewDeadline", "eligibilityPolicy", "eligibilityEvidence", "participationLimits", "initialFilePolicy", "declarationPolicy", "pitchPromptStructure", "referencesAppendixPolicy", "duplicateParticipationPolicy", "membershipAfterSubmission", "memberConfirmationPolicy", "soloConsumesFinalistQuota", "finalistCapPerTrack", "selectionCriteria", "selectionScoreMin", "selectionScoreMax", "minimumReviews", "rankingTiePolicy", "finalRubric", "judgeCount", "finalTieRules", "crossPanelPolicy", "presentationRules", "finalMaterialPolicy", "activityEvidencePolicy", "requiredActivities", "certificateAwardPolicy", "feesIPPublicityPolicy", "preparationDeadlines", "originalityReviewPolicy", "soloTeamAwardPolicy", ...HACKATHON_FRAMEWORK_SETTING_KEYS] as const;
export type StaffCompetitionResponse = { state: string; formToken?: string; settings?: Record<string, SettingValue>; version?: number; enabled?: boolean; evidenceReady?: boolean; stageStates?: Record<string, string>; entries?: StaffCompetitionEntry[]; assignments?: CompetitionAssignment[]; packet?: CompetitionPacket; assignment?: CompetitionAssignment; count?: number; fileTransfer?: { fileId: string; url: string } };
export const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const text = (value: unknown, max = 12000): value is string => typeof value === "string" && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
export const integer = (value: unknown, min = 0): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= 2147483647;
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).sort().join(",") === [...keys].sort().join(",");
export function decodeCompetitionPacket(value: unknown): CompetitionPacket | null {
  const data = record(value); if (!data || !(["title", "pitch", "narrative", "track"].every((key) => Object.hasOwn(data, key)) && Object.keys(data).every((key) => ["title", "pitch", "narrative", "track", "references", "links"].includes(key))) || !text(data.title, 1000) || !text(data.pitch, 20000) || !text(data.narrative, 100000) || data.track !== null && !["translating_research", "advancing_research"].includes(String(data.track))) return null;
  if (data.references !== undefined && !text(data.references, 20000) || data.links !== undefined && (!Array.isArray(data.links) || data.links.length > 5 || !data.links.every((link) => text(link, 2000) && /^https:\/\//.test(link)))) return null;
  return { title: data.title, pitch: data.pitch, narrative: data.narrative, track: data.track as string | null, ...(data.references !== undefined ? { references: data.references as string } : {}), ...(data.links !== undefined ? { links: data.links as string[] } : {}) };
}
export function decodeCompetitionRubric(value: unknown): CompetitionCriterion[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const rows: CompetitionCriterion[] = [];
  for (const raw of value) {
    const row = record(raw);
    if (!row || !["id", "label", "min", "max"].every((key) => Object.hasOwn(row, key)) || Object.keys(row).some((key) => !["id", "label", "min", "max", "questions", "scale", "anchors", "rubricVersion"].includes(key)) || !text(row.id, 100) || !/^[A-Za-z0-9_-]+$/.test(row.id) || !text(row.label, 500) || !row.label.trim() || typeof row.min !== "number" || typeof row.max !== "number" || !Number.isFinite(row.min) || !Number.isFinite(row.max) || row.min >= row.max) return null;
    if (row.questions !== undefined && (!Array.isArray(row.questions) || row.questions.length > 20 || !row.questions.every((question) => text(question, 2000)))) return null;
    if (row.rubricVersion !== undefined && (!text(row.rubricVersion, 100) || !row.rubricVersion.trim())) return null;
    for (const key of ["scale", "anchors"] as const) {
      if (row[key] === undefined) continue;
      if (!Array.isArray(row[key]) || row[key].length > 20) return null;
      const seen = new Set<number>();
      for (const rawPoint of row[key]) {
        const point = record(rawPoint);
        if (!point || !exact(point, key === "scale" ? ["score", "label", "description"] : ["score", "description"]) || !Number.isInteger(point.score) || Number(point.score) < row.min || Number(point.score) > row.max || seen.has(Number(point.score)) || !text(point.description, 2000) || key === "scale" && !text(point.label, 100)) return null;
        seen.add(Number(point.score));
      }
    }
    rows.push({ id: row.id, label: row.label, min: row.min, max: row.max, ...(row.questions !== undefined ? { questions: row.questions as string[] } : {}), ...(row.scale !== undefined ? { scale: row.scale as CompetitionScalePoint[] } : {}), ...(row.anchors !== undefined ? { anchors: row.anchors as { score: number; description: string }[] } : {}), ...(row.rubricVersion !== undefined ? { rubricVersion: row.rubricVersion as string } : {}) });
  }
  return new Set(rows.map((row) => row.id)).size === rows.length ? rows : null;
}
export function decodeCompetitionScorecard(value: unknown): CompetitionScorecard | null {
  const data = record(value); if (!data || !exact(data, ["scores", "comments"]) || !Array.isArray(data.scores) || data.scores.length > 100 || !text(data.comments)) return null;
  const scores: CompetitionScorecard["scores"] = [];
  for (const raw of data.scores) { const row = record(raw); if (!row || !exact(row, ["criterionId", "value"]) || !text(row.criterionId, 100) || typeof row.value !== "number" || !Number.isFinite(row.value)) return null; scores.push({ criterionId: row.criterionId, value: row.value }); }
  return new Set(scores.map((row) => row.criterionId)).size === scores.length ? { scores, comments: data.comments } : null;
}
export function decodeCompetitionAssignment(value: unknown): CompetitionAssignment | null {
  const row = record(value); if (!row || !uuid(row.id) || !uuid(row.entryId) || !integer(row.version, 1) || !text(row.status, 100) || !text(row.title, 1000)) return null;
  const packet = row.packet === null ? null : decodeCompetitionPacket(row.packet), rubric = row.rubric === null ? null : decodeCompetitionRubric(row.rubric), scorecard = row.scorecard === null ? null : decodeCompetitionScorecard(row.scorecard);
  if (row.packet !== null && !packet || row.rubric !== null && !rubric || row.scorecard !== null && !scorecard) return null;
  const files: { id: string; name: string }[] = [];
  if (row.files !== undefined) { if (!Array.isArray(row.files) || row.files.length > 100) return null; for (const raw of row.files) { const file = record(raw); if (!file || !uuid(file.id) || !text(file.name, 500)) return null; files.push({ id: file.id, name: file.name }); } }
  return { id: row.id, entryId: row.entryId, version: row.version, status: row.status, title: row.title, packet, rubric, scorecard, ...(row.files !== undefined ? { files } : {}) };
}
