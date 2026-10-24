import "server-only";

import { conferenceConfig } from "@/config/conference";
import { contactConfig } from "@/config/contact";
import { siteOrigin } from "@/lib/metadata";

/** ENG-074: current task explicitly requests English transactional drafts.
 * This scoped choice does not change ORG-059's other participant templates. */
export const workshopNoticeTemplate = { key: "workshop_notice", version: 1, approval: "DRAFT" } as const;
export const workshopNoticeEvents = ["requested", "waitlisted", "approved", "declined", "expired", "offered", "offer_accepted", "confirmed",
  "cancelled", "removed", "time_changed", "capacity_changed", "conflict", "extended"] as const;
type Event = typeof workshopNoticeEvents[number];
type Payload = { event: Event; workshop_title: string; booking_id: string; deadline: string | null };

export function validWorkshopNoticePayload(value: Record<string, unknown>): value is Payload {
  return Object.keys(value).sort().join(",") === "booking_id,deadline,event,workshop_title"
    && workshopNoticeEvents.includes(value.event as Event)
    && typeof value.workshop_title === "string" && value.workshop_title.trim().length > 0 && value.workshop_title.length <= 300
    && typeof value.booking_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.booking_id)
    && (value.deadline === null || typeof value.deadline === "string"
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value.deadline)
      && Number.isFinite(Date.parse(value.deadline)));
}
const wording: Record<Event, { subject: string; body: string }> = {
  requested: { subject: "Workshop booking request received", body: "Your workshop request is awaiting review. Your place is provisionally held until the deadline shown below; this request does not confirm a booking." },
  waitlisted: { subject: "Workshop waitlist entry received", body: "You are on the workshop waitlist. No seat is allocated and no payment is required for a waitlist entry. This email does not confirm a booking." },
  approved: { subject: "Workshop request approved", body: "Your workshop request was approved. Complete the required payment or validated full discount before the deadline. Approval alone does not confirm a booking." },
  declined: { subject: "Workshop request declined", body: "Your workshop request was declined. Any provisional allocation for this request has been released." },
  expired: { subject: "Workshop allocation expired", body: "Your workshop hold or offer expired and its provisional allocation has been released." },
  offered: { subject: "Workshop place offered", body: "A workshop place is offered to you until the deadline shown below. Accept in My Bookings. Acceptance is followed by the required approval and payment steps; an offer does not confirm a booking." },
  offer_accepted: { subject: "Workshop offer accepted", body: "Your workshop offer was accepted. Your request is awaiting review. Complete the required approval and payment steps before the hold deadline." },
  confirmed: { subject: "Workshop booking confirmed", body: "Your workshop booking is confirmed. View the current workshop details in My Bookings." },
  cancelled: { subject: "Workshop booking cancelled", body: "Your workshop booking or request was cancelled. Any allocation for it has been released." },
  removed: { subject: "Workshop removed", body: "The workshop has been removed. Your booking or request has been cancelled and its allocation released." },
  time_changed: { subject: "Workshop time changed", body: "The workshop time has changed. Review the current time and your booking status in My Bookings." },
  capacity_changed: { subject: "Workshop capacity changed", body: "The workshop capacity has changed. Review your current booking status in My Bookings." },
  conflict: { subject: "Workshop booking needs resolution", body: "A workshop schedule change conflicts with another allocation. Your booking needs organizer resolution. View its current status in My Bookings." },
  extended: { subject: "Workshop hold extended", body: "An authorized organizer extended your workshop hold. Complete the remaining steps before the new deadline shown below." },
};
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

/** Preview only. SQL delivery_hold and the worker's independent DRAFT guard deny sending. */
export function renderWorkshopNotice(payload: Payload, recipient: string) {
  const copy = wording[payload.event], url = `${siteOrigin}/en/my-msrc`;
  const paragraphs = [`Workshop: ${payload.workshop_title}`, copy.body,
    ...(payload.deadline ? [`Deadline: ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(payload.deadline))} (Asia/Riyadh).`] : []),
    `Sign in to My Bookings: ${url}`, `Support: ${contactConfig.recipient}`];
  return Object.freeze({ from: `MSRC ${conferenceConfig.edition} <${contactConfig.sender}>`, to: [recipient], subject: copy.subject,
    text: paragraphs.join("\n\n"), html: `<html lang="en"><body>${paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("")}</body></html>` });
}
