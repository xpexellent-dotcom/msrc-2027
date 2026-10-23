import "server-only";

import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import type { EmailRequest } from "./outbox.server";
import { renderParticipantBody } from "./participant-message.server";

export const announcementTemplate = { key: "announcement", version: 1, approval: "DRAFT" } as const;
export type AnnouncementEmailPayload = Readonly<{
  subject_en: string; subject_ar: string; body_en: string; body_ar: string;
}>;

/** Technical size bounds fit the incumbent outbox's 64 KiB provider snapshot.
 * Authored text is never HTML, a URL destination, or a replacement template. */
export function validAnnouncementPayload(value: unknown): value is AnnouncementEmailPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join(",") !== "body_ar,body_en,subject_ar,subject_en") return false;
  return ["subject_en", "subject_ar", "body_en", "body_ar"].every((key) => {
    const text = row[key];
    return typeof text === "string" && !!text.trim()
      && text.length <= (key.startsWith("subject") ? 90 : 3_500)
      && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
      && (!key.startsWith("subject") || !/[\r\n\t]/.test(text))
      && !/<[!/?a-z][^>]*>/i.test(text);
  });
}

/** ORG-059: Super Admin text, English then Arabic, approved-art banner, no opt-out.
 * Rendering a private preview never enqueues or delivers a message. */
export function renderAnnouncementEmail(payload: AnnouncementEmailPayload, recipientEmail = "preview@example.invalid"): EmailRequest {
  if (!validAnnouncementPayload(payload) || recipientEmail.length > 254
    || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(recipientEmail)) {
    throw new Error("Invalid announcement content.");
  }
  const paragraphs = (subject: string, body: string) => [subject, ...body.replace(/\r\n?/g, "\n").split(/\n[\t ]*\n/).filter((value) => value.trim())];
  const body = renderParticipantBody(paragraphs(payload.subject_en, payload.body_en), paragraphs(payload.subject_ar, payload.body_ar), []);
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`, to: [recipientEmail],
    subject: `${payload.subject_en} | ${payload.subject_ar}`, ...body });
}
