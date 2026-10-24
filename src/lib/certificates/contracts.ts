/** ENG-075; CRT-01..06. Explicit projections keep feedback out of identity views. */
export type CertificateKind = "conference" | "workshop";
export type SurveyOption = { value: string; labelEn: string; labelAr: string };
export type SurveyQuestion = { id: string; type: "rating_scale" | "single_choice" | "short_text"; labelEn: string; labelAr: string; required: boolean; scaleMin?: number; scaleMax?: number; options?: SurveyOption[] };
export type SurveyFields = { id?: string; kind: CertificateKind; workshopId: string | null; titleEn: string; titleAr: string; version: number; published: boolean; deadline: string | null; questions: SurveyQuestion[] };
export type Survey = SurveyFields & { id: string; completionCount?: number; completed?: boolean };
export type CertificateTemplate = { id: string; kind: CertificateKind; titleEn: string; titleAr: string; signature: string; approved: boolean; version: number };
export type CertificateEligibility = { actorId?: string; recipientName: string; kind: CertificateKind; workshopId: string | null; activity: string; eligible: boolean; reasons: string[] };
export type CertificateRecord = { id: string; recipientName: string; kind: CertificateKind; activity: string; edition?: string; status: "pending" | "issued" | "revoked" | "replaced"; code: string; correction: { id: string; requestedName: string; status: "pending" | "approved" | "rejected" } | null };
export type CertificateSettings = { enabled: boolean; surveysEnabled: boolean; feedbackRetentionDays: number | null; downloadRetentionDays: number | null; verificationRetentionDays: number | null; unlinkingApproved: boolean };
export type CertificateStaffResponse = { state: string; settings?: CertificateSettings; surveys?: Survey[]; templates?: CertificateTemplate[]; eligibility?: CertificateEligibility[]; certificates?: CertificateRecord[]; workshops?: { id: string; titleEn: string | null; titleAr: string | null }[]; formToken?: string };
export type ParticipantCertificateResponse = { state: string; surveys?: Survey[]; eligibility?: CertificateEligibility[]; certificates?: CertificateRecord[]; formToken?: string };
export type CertificateStaffPayload = { action: "saveSurvey" | "saveTemplate" | "approveTemplate" | "release" | "revoke" | "approveCorrection" | "rejectCorrection" | "settings"; operationId: string; formToken?: string; survey?: SurveyFields; template?: Omit<CertificateTemplate, "id" | "approved"> & { id?: string }; templateId?: string; expectedVersion?: number; workshopId?: string | null; certificateId?: string; correctionId?: string; reason?: string; settings?: CertificateSettings };
export type ParticipantCertificatePayload = { action: "submitSurvey"; surveyId: string; answers: Record<string, string | number>; formToken?: string } | { action: "requestCorrection"; certificateId: string; requestedName: string; formToken?: string };
export type VerificationDetails = { recipient_name: string; certificate_type: string; edition: string; activity: string; validity: "valid" | "revoked" | "replaced" };
export type VerificationResult = { state: "ready"; certificate: VerificationDetails } | { state: "not-found" | "limited" | "closed" | "area-not-ready" | "unavailable" };

export const certificateObject = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const certificateUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown, limit = 200, empty = false): value is string => typeof value === "string" && value.length <= limit && (empty || !!value.trim()) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const integer = (value: unknown, minimum = 0): value is number => Number.isSafeInteger(value) && Number(value) >= minimum;
const kind = (value: unknown): value is CertificateKind => value === "conference" || value === "workshop";
const keys = (row: Record<string, unknown>, allowed: readonly string[]) => Object.keys(row).every((key) => allowed.includes(key));
const date = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));

export function decodeSurveyQuestions(value: unknown): SurveyQuestion[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const questions: SurveyQuestion[] = [];
  for (const raw of value) {
    const row = certificateObject(raw);
    if (!row || !text(row.id, 64) || !/^[a-zA-Z0-9_-]+$/.test(row.id) || questions.some((q) => q.id === row.id) || !text(row.labelEn, 500) || !text(row.labelAr, 500) || typeof row.required !== "boolean") return null;
    const question = { id: row.id, labelEn: row.labelEn, labelAr: row.labelAr, required: row.required };
    const base = ["id", "type", "labelEn", "labelAr", "required"];
    if (row.type === "short_text" && keys(row, base)) questions.push({ ...question, type: "short_text" });
    else if (row.type === "rating_scale" && keys(row, [...base, "scaleMin", "scaleMax"]) && integer(row.scaleMin) && integer(row.scaleMax) && row.scaleMin < row.scaleMax && row.scaleMax <= 100) questions.push({ ...question, type: "rating_scale", scaleMin: row.scaleMin, scaleMax: row.scaleMax });
    else if (row.type === "single_choice" && keys(row, [...base, "options"]) && Array.isArray(row.options) && row.options.length >= 2 && row.options.length <= 20) {
      const options: SurveyOption[] = [];
      for (const rawOption of row.options) {
        const option = certificateObject(rawOption);
        if (!option || !keys(option, ["value", "labelEn", "labelAr"]) || !text(option.value, 64) || !/^[a-zA-Z0-9_-]+$/.test(option.value) || options.some((item) => item.value === option.value) || !text(option.labelEn, 200) || !text(option.labelAr, 200)) return null;
        options.push({ value: option.value, labelEn: option.labelEn, labelAr: option.labelAr });
      }
      questions.push({ ...question, type: "single_choice", options });
    } else return null;
  }
  return questions;
}

export function decodeSurveyFields(value: unknown): SurveyFields | null {
  const row = certificateObject(value), questions = decodeSurveyQuestions(row?.questions);
  if (!row || !keys(row, ["id", "kind", "workshopId", "titleEn", "titleAr", "version", "deadline", "published", "questions"]) || row.id !== undefined && !certificateUuid(row.id) || !kind(row.kind) || row.workshopId !== null && !certificateUuid(row.workshopId) || row.kind === "conference" && row.workshopId !== null || row.kind === "workshop" && row.workshopId === null || !text(row.titleEn) || !text(row.titleAr) || !integer(row.version) || typeof row.published !== "boolean" || row.deadline !== null && !date(row.deadline) || !questions || row.published && (!questions.length || row.deadline === null)) return null;
  return { ...(row.id ? { id: row.id as string } : {}), kind: row.kind, workshopId: row.workshopId as string | null, titleEn: row.titleEn, titleAr: row.titleAr, version: row.version, deadline: row.deadline as string | null, published: row.published, questions };
}

export function decodeCertificateSettings(value: unknown): CertificateSettings | null {
  const row = certificateObject(value);
  if (!row || !keys(row, ["enabled", "surveysEnabled", "feedbackRetentionDays", "downloadRetentionDays", "verificationRetentionDays", "unlinkingApproved"]) || [row.enabled, row.surveysEnabled, row.unlinkingApproved].some((v) => typeof v !== "boolean") || [row.feedbackRetentionDays, row.downloadRetentionDays].some((v) => v !== null && (!integer(v, 1) || v > 3650)) || row.verificationRetentionDays !== null && (!integer(row.verificationRetentionDays, 1) || row.verificationRetentionDays > 36500)) return null;
  return { enabled: row.enabled as boolean, surveysEnabled: row.surveysEnabled as boolean, feedbackRetentionDays: row.feedbackRetentionDays as number | null, downloadRetentionDays: row.downloadRetentionDays as number | null, verificationRetentionDays: row.verificationRetentionDays as number | null, unlinkingApproved: row.unlinkingApproved as boolean };
}

export function decodeCertificateStaffPayload(value: unknown): CertificateStaffPayload | null {
  const row = certificateObject(value);
  if (!row || !certificateUuid(row.operationId)) return null;
  const base = ["action", "operationId", "formToken"], result = { operationId: row.operationId };
  if (row.action === "saveSurvey") { const survey = decodeSurveyFields(row.survey); return keys(row, [...base, "survey"]) && survey ? { ...result, action: row.action, survey } : null; }
  if (row.action === "saveTemplate") {
    const item = certificateObject(row.template);
    return keys(row, [...base, "template"]) && item && keys(item, ["id", "kind", "titleEn", "titleAr", "signature", "version"]) && (item.id === undefined || certificateUuid(item.id)) && kind(item.kind) && text(item.titleEn) && text(item.titleAr) && text(item.signature) && integer(item.version) ? { ...result, action: row.action, template: { ...(item.id ? { id: item.id as string } : {}), kind: item.kind, titleEn: item.titleEn, titleAr: item.titleAr, signature: item.signature, version: item.version } } : null;
  }
  if (row.action === "approveTemplate") return keys(row, [...base, "templateId", "expectedVersion"]) && certificateUuid(row.templateId) && integer(row.expectedVersion, 1) ? { ...result, action: row.action, templateId: row.templateId, expectedVersion: row.expectedVersion } : null;
  if (row.action === "release") return keys(row, [...base, "templateId", "expectedVersion", "workshopId"]) && certificateUuid(row.templateId) && integer(row.expectedVersion, 1) && (row.workshopId === null || certificateUuid(row.workshopId)) ? { ...result, action: row.action, templateId: row.templateId, expectedVersion: row.expectedVersion, workshopId: row.workshopId } : null;
  if (row.action === "revoke") return keys(row, [...base, "certificateId", "reason"]) && certificateUuid(row.certificateId) && text(row.reason, 300) ? { ...result, action: row.action, certificateId: row.certificateId, reason: row.reason } : null;
  if (row.action === "approveCorrection" || row.action === "rejectCorrection") return keys(row, [...base, "correctionId", "reason"]) && certificateUuid(row.correctionId) && text(row.reason, 300) ? { ...result, action: row.action, correctionId: row.correctionId, reason: row.reason } : null;
  if (row.action === "settings") { const settings = decodeCertificateSettings(row.settings); return keys(row, [...base, "settings"]) && settings ? { ...result, action: row.action, settings } : null; }
  return null;
}

export function decodeParticipantCertificatePayload(value: unknown): ParticipantCertificatePayload | null {
  const row = certificateObject(value);
  if (!row) return null;
  if (row.action === "requestCorrection") return keys(row, ["action", "certificateId", "requestedName", "formToken"]) && certificateUuid(row.certificateId) && text(row.requestedName, 120) ? { action: row.action, certificateId: row.certificateId, requestedName: row.requestedName.trim() } : null;
  if (row.action !== "submitSurvey" || !keys(row, ["action", "surveyId", "answers", "formToken"]) || !certificateUuid(row.surveyId)) return null;
  const answers = certificateObject(row.answers);
  if (!answers || Object.keys(answers).length > 40 || Object.entries(answers).some(([key, v]) => !/^[a-zA-Z0-9_-]{1,64}$/.test(key) || !(typeof v === "string" && text(v, 1000, true) || integer(v) && v <= 100))) return null;
  return { action: row.action, surveyId: row.surveyId, answers: Object.fromEntries(Object.entries(answers)) as Record<string, number | string> };
}

function surveys(value: unknown): Survey[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const result: Survey[] = [];
  for (const raw of value) {
    const row = certificateObject(raw);
    if (!row) return null;
    const fields = decodeSurveyFields(Object.fromEntries(Object.entries(row).filter(([key]) => !["completed", "completionCount"].includes(key))));
    if (!fields?.id || row.completed !== undefined && typeof row.completed !== "boolean" || row.completionCount !== undefined && !integer(row.completionCount)) return null;
    result.push({ ...fields, id: fields.id, ...(row.completed !== undefined ? { completed: row.completed as boolean } : {}), ...(row.completionCount !== undefined ? { completionCount: row.completionCount as number } : {}) });
  }
  return result;
}
function eligibility(value: unknown, participant: boolean): CertificateEligibility[] | null {
  if (!Array.isArray(value) || value.length > 5000) return null;
  const result: CertificateEligibility[] = [];
  for (const raw of value) {
    const row = certificateObject(raw);
    if (!row || !keys(row, ["actorId", "recipientName", "kind", "workshopId", "activity", "eligible", "reasons"]) || !text(row.recipientName) || !kind(row.kind) || row.workshopId !== null && !certificateUuid(row.workshopId) || !text(row.activity, 500, true) || typeof row.eligible !== "boolean" || !Array.isArray(row.reasons) || row.reasons.length > 20 || row.reasons.some((v) => !text(v, 80)) || row.actorId !== undefined && !certificateUuid(row.actorId)) return null;
    result.push({ ...(!participant && row.actorId ? { actorId: row.actorId as string } : {}), recipientName: row.recipientName, kind: row.kind, workshopId: row.workshopId as string | null, activity: row.activity, eligible: row.eligible, reasons: row.reasons as string[] });
  }
  return result;
}
function certificates(value: unknown): CertificateRecord[] | null {
  if (!Array.isArray(value) || value.length > 5000) return null;
  const result: CertificateRecord[] = [];
  for (const raw of value) {
    const row = certificateObject(raw), correction = certificateObject(row?.correction);
    if (!row || !keys(row, ["id", "recipientName", "kind", "activity", "edition", "status", "code", "correction"]) || !certificateUuid(row.id) || !text(row.recipientName) || !kind(row.kind) || !text(row.activity, 500) || row.edition !== undefined && !text(row.edition) || !["pending", "issued", "revoked", "replaced"].includes(String(row.status)) || !text(row.code, 128) || !/^[A-Za-z0-9_-]+$/.test(row.code) || row.correction !== null && (!correction || !keys(correction, ["id", "requestedName", "status"]) || !certificateUuid(correction.id) || !text(correction.requestedName) || !["pending", "approved", "rejected"].includes(String(correction.status)))) return null;
    result.push({ id: row.id, recipientName: row.recipientName, kind: row.kind, activity: row.activity, ...(row.edition ? { edition: row.edition as string } : {}), status: row.status as CertificateRecord["status"], code: row.code, correction: correction ? { id: correction.id as string, requestedName: correction.requestedName as string, status: correction.status as "pending" | "approved" | "rejected" } : null });
  }
  return result;
}
export function decodeParticipantCertificateResponse(value: unknown): ParticipantCertificateResponse | null {
  const row = certificateObject(value);
  if (!row || typeof row.state !== "string") return null;
  if (row.state !== "ready") return { state: row.state, ...(typeof row.formToken === "string" && row.formToken.length <= 2048 ? { formToken: row.formToken } : {}) };
  const surveyRows = surveys(row.surveys), eligibilityRows = eligibility(row.eligibility, true), certificateRows = certificates(row.certificates);
  return surveyRows && eligibilityRows && certificateRows ? { state: "ready", surveys: surveyRows, eligibility: eligibilityRows, certificates: certificateRows, ...(typeof row.formToken === "string" ? { formToken: row.formToken } : {}) } : null;
}
export function decodeCertificateStaffResponse(value: unknown): CertificateStaffResponse | null {
  const row = certificateObject(value);
  if (!row || typeof row.state !== "string") return null;
  if (row.state !== "ready") return { state: row.state, ...(typeof row.formToken === "string" && row.formToken.length <= 2048 ? { formToken: row.formToken } : {}) };
  const own = decodeParticipantCertificateResponse(row), eligibilityRows = eligibility(row.eligibility, false), settings = decodeCertificateSettings(row.settings);
  if (!own || !eligibilityRows || !settings || !Array.isArray(row.templates) || row.templates.length > 2 || !Array.isArray(row.workshops) || row.workshops.length > 500) return null;
  const templates: CertificateTemplate[] = [], workshops: { id: string; titleEn: string | null; titleAr: string | null }[] = [];
  for (const raw of row.templates) { const item = certificateObject(raw); if (!item || !keys(item, ["id", "kind", "titleEn", "titleAr", "signature", "approved", "version"]) || !certificateUuid(item.id) || !kind(item.kind) || !text(item.titleEn, 200, true) || !text(item.titleAr, 200, true) || !text(item.signature, 500, true) || typeof item.approved !== "boolean" || !integer(item.version)) return null; templates.push(item as CertificateTemplate); }
  for (const raw of row.workshops) { const item = certificateObject(raw); if (!item || !keys(item, ["id", "titleEn", "titleAr"]) || !certificateUuid(item.id) || item.titleEn !== null && !text(item.titleEn, 200, true) || item.titleAr !== null && !text(item.titleAr, 200, true)) return null; workshops.push(item as { id: string; titleEn: string | null; titleAr: string | null }); }
  return { ...own, settings, eligibility: eligibilityRows, templates, workshops };
}
export function decodeCertificateVerification(value: unknown): VerificationDetails | null {
  const row = certificateObject(value);
  if (!row || !keys(row, ["recipient_name", "certificate_type", "edition", "activity", "validity"]) || Object.keys(row).length !== 5 || !text(row.recipient_name) || !text(row.certificate_type) || !text(row.edition) || !text(row.activity, 500) || !["valid", "revoked", "replaced"].includes(String(row.validity))) return null;
  return { recipient_name: row.recipient_name, certificate_type: row.certificate_type, edition: row.edition, activity: row.activity, validity: row.validity as VerificationDetails["validity"] };
}
