import { describe, expect, it } from "vitest";
import { decodeCertificateSettings, decodeCertificateStaffPayload, decodeCertificateStaffResponse, decodeCertificateVerification, decodeParticipantCertificatePayload, decodeParticipantCertificateResponse, decodeSurveyFields, decodeSurveyQuestions } from "@/lib/certificates/contracts";
import { certificateCopy, eligibilityReason } from "@/components/certificates/copy";

const id = "22222222-2222-4222-8222-222222222222", operationId = "33333333-3333-4333-8333-333333333333";
const baseQuestion = { id: "q1", labelEn: "Synthetic approved label", labelAr: "سؤال اختباري معتمد", required: true };
const questions = [{ ...baseQuestion, type: "rating_scale", scaleMin: 0, scaleMax: 4 }, { ...baseQuestion, id: "q2", type: "single_choice", options: [{ value: "a", labelEn: "Synthetic A", labelAr: "أ" }, { value: "b", labelEn: "Synthetic B", labelAr: "ب" }] }, { ...baseQuestion, id: "q3", type: "short_text", required: false }];
const survey = { id, kind: "conference", workshopId: null, titleEn: "Synthetic survey", titleAr: "استبيان اختباري", version: 1, deadline: "2027-01-29T20:00:00Z", published: true, questions };
const eligibility = [{ actorId: id, recipientName: "Synthetic Recipient", kind: "conference", workshopId: null, activity: "Synthetic edition", eligible: false, reasons: ["both_days_required"] }];
const certificates = [{ id, recipientName: "Synthetic Recipient", kind: "conference", activity: "Synthetic edition", status: "revoked", code: "uGh0lR4VrWts8WGTNcg6V0lm4MKoYdQe", correction: null }];
const settings = { enabled: false, surveysEnabled: false, feedbackRetentionDays: null, downloadRetentionDays: null, verificationRetentionDays: null, unlinkingApproved: false };
const ready = { state: "ready", surveys: [{ ...survey, completed: false, completionCount: 5 }], eligibility, certificates, formToken: "synthetic-form-token" };

describe("CRT-02 survey authoring and bounded transport", () => {
  it("ships an empty editable draft without inventing questions", () => { expect(decodeSurveyFields({ ...survey, published: false, deadline: null, questions: [] })?.questions).toEqual([]); });
  it("accepts the three selected question types", () => { expect(decodeSurveyQuestions(questions)).toEqual(questions); });
  it.each([
    [{ ...baseQuestion, type: "email" }],
    [{ ...baseQuestion, type: "rating_scale", scaleMin: 4, scaleMax: 1 }],
    [{ ...baseQuestion, type: "rating_scale", scaleMin: 0, scaleMax: 101 }],
    [{ ...baseQuestion, type: "rating_scale", scaleMin: 1.5, scaleMax: 4 }],
    [{ ...baseQuestion, type: "rating_scale" }],
    [questions[1], questions[1]],
    [{ ...questions[1], options: [{ value: "a", labelEn: "A", labelAr: "أ" }] }],
    [{ ...questions[1], options: [{ value: "a", labelEn: "A", labelAr: "أ" }, { value: "a", labelEn: "B", labelAr: "ب" }] }],
    [{ ...questions[2], actorId: id }],
    [{ ...questions[2], labelAr: "" }],
  ])("rejects invalid or identifying question structures %#", (...items) => { expect(decodeSurveyQuestions(items)).toBeNull(); });
  it("requires questions and a deadline to publish", () => { expect(decodeSurveyFields({ ...survey, questions: [] })).toBeNull(); expect(decodeSurveyFields({ ...survey, deadline: null })).toBeNull(); });
  it("requires a workshop for a workshop survey and none for conference", () => { expect(decodeSurveyFields({ ...survey, kind: "workshop" })).toBeNull(); expect(decodeSurveyFields({ ...survey, workshopId: id })).toBeNull(); expect(decodeSurveyFields({ ...survey, kind: "workshop", workshopId: id })).not.toBeNull(); });
  it("retains only survey identity and answers in feedback input", () => { expect(decodeParticipantCertificatePayload({ action: "submitSurvey", surveyId: id, answers: { q1: 4, q2: "a", q3: "Synthetic feedback" }, formToken: "not-forwarded" })).toEqual({ action: "submitSurvey", surveyId: id, answers: { q1: 4, q2: "a", q3: "Synthetic feedback" } }); });
  it.each(["actorId", "responseId", "requestId", "token", "email", "ip", "submittedAt"])("rejects retained linkage property %s", (key) => { expect(decodeParticipantCertificatePayload({ action: "submitSurvey", surveyId: id, answers: {}, [key]: id })).toBeNull(); });
  it("bounds answer text, numbers and question counts", () => { for (const answers of [{ q1: "a".repeat(1001) }, { q1: -1 }, { q1: 101 }, { q1: { nested: true } }, Object.fromEntries(Array.from({ length: 41 }, (_, index) => ["q" + index, ""]))]) expect(decodeParticipantCertificatePayload({ action: "submitSurvey", surveyId: id, answers })).toBeNull(); });
});

describe("CRT-01/03/04/06 certificate contracts", () => {
  it("allows only the two ordinary template kinds", () => { for (const kind of ["one_day", "presenter", "reviewer", "speaker", "organizer", "hackathon", "3mt"]) expect(decodeCertificateStaffPayload({ action: "saveTemplate", operationId, template: { kind, titleEn: "Synthetic", titleAr: "اختباري", signature: "Synthetic signature", version: 0 } })).toBeNull(); });
  it("rejects an hours field", () => { expect(decodeCertificateStaffPayload({ action: "saveTemplate", operationId, template: { kind: "conference", titleEn: "Synthetic", titleAr: "اختباري", signature: "Synthetic signature", version: 0, hours: 6 } })).toBeNull(); });
  it("requires a valid operation ID for each staff mutation", () => { expect(decodeCertificateStaffPayload({ action: "release", templateId: id, workshopId: null })).toBeNull(); expect(decodeCertificateStaffPayload({ action: "release", operationId, templateId: id, expectedVersion: 1, workshopId: null })).toEqual({ action: "release", operationId, templateId: id, expectedVersion: 1, workshopId: null }); });
  it("does not let release inputs claim approval or eligibility", () => { expect(decodeCertificateStaffPayload({ action: "release", operationId, templateId: id, expectedVersion: 1, workshopId: null, approved: true })).toBeNull(); expect(decodeCertificateStaffPayload({ action: "release", operationId, templateId: id, expectedVersion: 1, workshopId: null, actorIds: [id] })).toBeNull(); });
  it("requires the reviewed template version for approval and release", () => { for (const action of ["approveTemplate", "release"]) for (const expectedVersion of [undefined, 0, -1, 1.5, "1"]) expect(decodeCertificateStaffPayload({ action, operationId, templateId: id, ...(action === "release" ? { workshopId: null } : {}), ...(expectedVersion === undefined ? {} : { expectedVersion }) })).toBeNull(); expect(decodeCertificateStaffPayload({ action: "approveTemplate", operationId, templateId: id, expectedVersion: 2 })).toEqual({ action: "approveTemplate", operationId, templateId: id, expectedVersion: 2 }); });
  it("requires a reason for revocation and correction decisions", () => { for (const action of ["revoke", "approveCorrection", "rejectCorrection"]) expect(decodeCertificateStaffPayload({ action, operationId, certificateId: id, correctionId: id, reason: "" })).toBeNull(); expect(decodeCertificateStaffPayload({ action: "revoke", operationId, certificateId: id, reason: "Synthetic correction reason" })).not.toBeNull(); });
  it("normalizes and bounds corrected names", () => { expect(decodeParticipantCertificatePayload({ action: "requestCorrection", certificateId: id, requestedName: " Corrected Name " })).toEqual({ action: "requestCorrection", certificateId: id, requestedName: "Corrected Name" }); expect(decodeParticipantCertificatePayload({ action: "requestCorrection", certificateId: id, requestedName: "A".repeat(121) })).toBeNull(); });
  it("leaves operational settings unset and closed", () => { expect(decodeCertificateSettings(settings)).toEqual(settings); });
  it("bounds independent retention settings", () => { for (const change of [{ feedbackRetentionDays: 3651 }, { downloadRetentionDays: 3651 }, { verificationRetentionDays: 36501 }, { feedbackRetentionDays: 0 }, { feedbackRetentionDays: 1.5 }]) expect(decodeCertificateSettings({ ...settings, ...change })).toBeNull(); expect(decodeCertificateSettings({ ...settings, feedbackRetentionDays: 3650, downloadRetentionDays: 3650, verificationRetentionDays: 36500 })).not.toBeNull(); });
  it("strips actor IDs from participant projections", () => { const projected = decodeParticipantCertificateResponse(ready); expect(projected?.eligibility?.[0]).not.toHaveProperty("actorId"); expect(projected?.certificates?.[0].status).toBe("revoked"); });
  it("keeps actor IDs only in authorized eligibility previews and no answers", () => { const projected = decodeCertificateStaffResponse({ ...ready, settings, templates: [], workshops: [], answers: [{ actorId: id, text: "do not forward" }] }); expect(projected?.eligibility?.[0].actorId).toBe(id); expect(projected).not.toHaveProperty("answers"); });
  it("keeps an incomplete workshop reviewable while its missing configuration blocks eligibility", () => { const projected = decodeCertificateStaffResponse({ ...ready, settings, templates: [], workshops: [{ id, titleEn: null, titleAr: null }], eligibility: [{ ...eligibility[0], kind: "workshop", workshopId: id, activity: "", reasons: ["configuration_required"] }] }); expect(projected?.workshops?.[0]).toEqual({ id, titleEn: null, titleAr: null }); expect(projected?.eligibility?.[0].eligible).toBe(false); });
  it("keeps an error form token for a safe retry without identity rows", () => { expect(decodeParticipantCertificateResponse({ ...ready, state: "invalid-input" })).toEqual({ state: "invalid-input", formToken: "synthetic-form-token" }); });
  it("rejects answer data hidden in a survey projection", () => { expect(decodeParticipantCertificateResponse({ ...ready, surveys: [{ ...survey, answers: { q1: "secret" } }] })).toBeNull(); });
  it("explains every required eligibility edge case in both languages", () => { for (const reason of ["both_days_required", "general_survey_required", "confirmed_booking_required", "workshop_checkin_required", "workshop_completion_required", "workshop_survey_required", "configuration_required"]) for (const locale of ["en", "ar"] as const) expect(eligibilityReason(reason, locale)).toBe(certificateCopy[locale].reasons[reason as keyof typeof certificateCopy.en.reasons]); });
});

describe("CRT-05 public allowlist", () => {
  const details = { recipient_name: "Synthetic Recipient", certificate_type: "conference", edition: "Synthetic edition", activity: "Synthetic activity", validity: "valid" };
  it("returns exactly the five verification fields", () => { expect(decodeCertificateVerification(details)).toEqual(details); expect(Object.keys(decodeCertificateVerification(details)!)).toHaveLength(5); });
  it.each(["id", "actor_id", "email", "phone", "licence", "score", "hours", "code", "signature"])("rejects public property %s", (key) => { expect(decodeCertificateVerification({ ...details, [key]: "private" })).toBeNull(); });
  it.each(["valid", "revoked", "replaced"])("retains the %s state", (validity) => { expect(decodeCertificateVerification({ ...details, validity })?.validity).toBe(validity); });
  it("never treats a pending certificate as publicly valid", () => { expect(decodeCertificateVerification({ ...details, validity: "pending" })).toBeNull(); });
});
