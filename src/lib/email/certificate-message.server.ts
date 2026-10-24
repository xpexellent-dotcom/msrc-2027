import "server-only";
import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import { siteOrigin } from "@/lib/metadata";

/** ENG-075 explicitly requests English for this new transactional DRAFT only. */
export const certificateNoticeTemplate = { key: "certificate_notice", version: 1, approval: "DRAFT" } as const;
type Payload = { certificate_id: string; certificate_type: string; edition: string; activity: string };
export function validCertificateNoticePayload(value: Record<string, unknown>): value is Payload {
  return Object.keys(value).sort().join(",") === "activity,certificate_id,certificate_type,edition"
    && typeof value.certificate_id === "string" && /^[a-f0-9-]{36}$/i.test(value.certificate_id)
    && ["certificate_type", "edition", "activity"].every((key) => typeof value[key] === "string"
      && (value[key] as string).trim().length > 0 && (value[key] as string).length <= 300 && !/[\u0000-\u001f\u007f]/.test(value[key] as string));
}
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
/** Never send a public verification secret or private download capability by email. */
export function renderCertificateNotice(payload: Payload, recipient: string) {
  const paragraphs = ["Your certificate is available in My MSRC.", `Certificate: ${payload.certificate_type}`,
    `Edition: ${payload.edition}`, `Activity: ${payload.activity}`, `Sign in to download: ${siteOrigin}/en/my-msrc/certificates`,
    `Support: ${contactConfig.recipient}`];
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`, to: [recipient], subject: "Your MSRC certificate is available",
    text: paragraphs.join("\n\n"), html: `<html lang="en"><body><img src="${siteOrigin}/brand/email-banner.png" width="600" alt="MSRC 2027 - Medical Students Research Conference - PLACEHOLDER" />${paragraphs.map((value) => `<p>${escape(value)}</p>`).join("")}</body></html>` });
}
