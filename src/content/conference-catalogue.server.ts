import "server-only";
import { editionMedia } from "@/content/edition-media";
import { published, type PublicMedia, type PublicSession, type PublicSpeaker, type PublicWorkshop } from "@/content/conference-experiences";

// SCP-02 / PRG-01 / CMS-03 / WKS-01 / MED-01: programme and people remain unannounced.
// The 13 October 2026 request selects the 2023–26 archive; the homepage film is separate.
// Raw content remains server-only; draft records and asset URLs never enter client props.
export const conferenceSessions: readonly PublicSession[] = [];
export const conferenceSpeakers: readonly PublicSpeaker[] = [];
export const conferenceMedia: readonly PublicMedia[] = editionMedia;
export const conferenceWorkshops: readonly PublicWorkshop[] = [];

export function getPublicConferenceCatalogue() {
  return {
    sessions: published(conferenceSessions),
    speakers: published(conferenceSpeakers),
    media: published(conferenceMedia),
    workshops: published(conferenceWorkshops),
  };
}
