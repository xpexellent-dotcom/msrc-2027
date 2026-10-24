import { createCipheriv, randomBytes } from "node:crypto";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import type { CertificateStaffPayload, CertificateStaffResponse, ParticipantCertificateResponse, Survey } from "../../src/lib/certificates/contracts";

export const id = (value: number) => `ec120000-0000-4000-8000-${String(value).padStart(12, "0")}`;
export const syntheticSurvey: Survey = { id: id(1), kind: "conference", workshopId: null, titleEn: "Synthetic conference feedback", titleAr: "ملاحظات المؤتمر التجريبي", version: 1,
  published: true, deadline: "2030-01-30T00:00:00Z", completed: false, questions: [
    { id: "rating", type: "rating_scale", labelEn: "Synthetic rating", labelAr: "تقييم تجريبي", required: true, scaleMin: 1, scaleMax: 5 },
    { id: "choice", type: "single_choice", labelEn: "Synthetic choice", labelAr: "اختيار تجريبي", required: true, options: [{ value: "first", labelEn: "Synthetic first option", labelAr: "الخيار التجريبي الأول" }, { value: "second", labelEn: "Synthetic second option", labelAr: "الخيار التجريبي الثاني" }] },
    { id: "comment", type: "short_text", labelEn: "Synthetic comment", labelAr: "تعليق تجريبي", required: false },
  ] };
export const participantView: ParticipantCertificateResponse = { state: "ready", surveys: [syntheticSurvey], certificates: [], eligibility: [
  { recipientName: "Synthetic Participant", kind: "conference", workshopId: null, activity: "Synthetic edition", eligible: false, reasons: ["general_survey_required"] },
] };
export const completedParticipantView: ParticipantCertificateResponse = { ...participantView, surveys: [{ ...syntheticSurvey, completed: true }], eligibility: [{ ...participantView.eligibility![0], eligible: true, reasons: [] }] };
export async function participantFixture(context: BrowserContext, mode = "ready") {
  const suffix = randomBytes(6).toString("hex"), actorId = "da000000-0000-4000-8000-" + suffix, sessionId = "db000000-0000-4000-8000-" + suffix;
  const now = Date.now(), origin = "http://127.0.0.1:3216", claims = { sub: actorId, session_id: sessionId, role: "authenticated", aal: "aal1", exp: Math.floor(now / 1000) + 3600, amr: [{ method: "password", timestamp: Math.floor(now / 1000) }] };
  const accessToken = "synthetic." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".synthetic";
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from("a".repeat(64), "hex"), iv); cipher.setAAD(Buffer.from("msrc-participant-cookie-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ actorId, sessionId, accessToken, refreshToken: "synthetic", deadline: now + 71 * 3600_000, origin }), "utf8"), cipher.final()]);
  await context.addCookies([{ name: "msrc-participant-test", value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), url: origin, httpOnly: true, sameSite: "Strict" }]);
  const response = await context.request.post("http://127.0.0.1:3218/__synthetic/certificates", { headers: { apikey: "sb_secret_participant_mock_only" }, data: { actorId, mode, view: participantView, submittedView: completedParticipantView } });
  expect(response.ok()).toBe(true);
  return actorId;
}
export async function staffFixture(page: Page, options: { missing?: boolean; failure?: boolean; releaseEnabled?: boolean } = {}) {
  const actions: CertificateStaffPayload[] = [];
  let failed = false;
  const view: CertificateStaffResponse = { state: "ready", settings: { enabled: options.releaseEnabled === true, surveysEnabled: false,
    feedbackRetentionDays: options.releaseEnabled ? 7 : null, downloadRetentionDays: options.releaseEnabled ? 7 : null, verificationRetentionDays: options.releaseEnabled ? 7 : null, unlinkingApproved: options.releaseEnabled === true },
    surveys: [], templates: [{ id: id(3), kind: "conference", titleEn: "Full Two-Day Conference Attendance", titleAr: "حضور المؤتمر ليومين كاملين", signature: "Synthetic approved signatory", approved: false, version: 1 },
      { id: id(4), kind: "workshop", titleEn: "Workshop Participation", titleAr: "المشاركة في ورشة عمل", signature: "", approved: false, version: 0 }],
    eligibility: [{ actorId: id(5), recipientName: "Synthetic Participant", kind: "conference", workshopId: null, activity: "Synthetic edition", eligible: true, reasons: [] }], certificates: [], workshops: [] };
  await page.route("**/api/staff-portal**", async (route) => {
    if (new URL(route.request().url()).pathname !== "/api/staff-portal/certificates") return route.fulfill({ json: { state: "authenticated", profile: { actorId: id(9), name: "Synthetic Staff", roles: ["superAdmin"] }, formToken: "synthetic-staff-token" } });
    if (options.missing) return route.fulfill({ status: 503, json: { state: "area-not-ready", formToken: "synthetic-certificate-token" } });
    if (route.request().method() === "GET") return route.fulfill({ json: { ...view, formToken: "synthetic-certificate-token" } });
    const payload = route.request().postDataJSON() as CertificateStaffPayload;
    actions.push(payload); expect(payload.formToken).toBe("synthetic-certificate-token");
    if (options.failure && !failed) { failed = true; return route.fulfill({ status: 503, json: { state: "unavailable", formToken: "synthetic-certificate-token" } }); }
    if (payload.action === "approveTemplate") view.templates![0].approved = true;
    if (payload.action === "saveSurvey") view.surveys!.push({ ...payload.survey!, id: payload.survey?.id ?? id(6), completionCount: 0 });
    if (payload.action === "release") view.certificates = [{ id: id(7), recipientName: "Synthetic Participant", kind: "conference", activity: "Synthetic edition", status: "issued", code: "synthetic-opaque-code-" + "b".repeat(32), correction: null }];
    return route.fulfill({ json: { ...view, formToken: "synthetic-certificate-token" } });
  });
  return { view, actions };
}
