import "server-only";
import { published, type PublicMedia, type PublicSession, type PublicSpeaker, type PublicWorkshop } from "@/content/conference-experiences";

// SCP-02 / PRG-01 / CMS-03 / WKS-01 / MED-01: no approved public catalogue supplied.
// ORG-002 authorizes the MSRC2026 montage only in the existing homepage hero.
// Raw content remains server-only; draft records and asset URLs never enter client props.
export const conferenceSessions: readonly PublicSession[] = [];
export const conferenceSpeakers: readonly PublicSpeaker[] = [];
export const conferenceMedia: readonly PublicMedia[] = [];
export const conferenceWorkshops: readonly PublicWorkshop[] = [];

export function getPublicConferenceCatalogue() {
  return {
    sessions: published(conferenceSessions),
    speakers: published(conferenceSpeakers),
    media: published(conferenceMedia),
    workshops: published(conferenceWorkshops),
  };
}
