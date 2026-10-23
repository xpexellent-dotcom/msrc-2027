import "server-only";
import { editionMedia } from "@/content/edition-media";
import { published, type PublicMedia, type PublicSession, type PublicSpeaker, type PublicWorkshop } from "@/content/conference-experiences";
import { getPublishedContent } from "@/features/content/published.server";
import { contentSession, contentSpeaker } from "@/features/content/catalogue";
import { publishedOrFallback } from "@/features/content/published";
import { getPublishedMedia } from "@/features/media/published.server";
import type { Locale } from "@/lib/i18n";

// SCP-02 / PRG-01 / CMS-03 / WKS-01 / MED-01: programme and people remain unannounced.
// The 13 October 2026 request selects the 2023–26 archive; the homepage film is separate.
// Raw content remains server-only; draft records and asset URLs never enter client props.
export const conferenceSessions: readonly PublicSession[] = [];
export const conferenceSpeakers: readonly PublicSpeaker[] = [];
export const conferenceMedia: readonly PublicMedia[] = editionMedia;
export const conferenceWorkshops: readonly PublicWorkshop[] = [];

/** Workshop booking/catalogue content is outside the edited programme collections. */
export function getPublicWorkshops() { return published(conferenceWorkshops); }

export async function getPublicConferenceCatalogue(locale: Locale = "en") {
  const [sessions, speakers, media] = await Promise.all([
    publishedOrFallback(async () => (await getPublishedContent("sessions")).map((item) => contentSession(item, locale)), published(conferenceSessions)),
    publishedOrFallback(async () => (await getPublishedContent("speakers")).map((item) => contentSpeaker(item, locale)), published(conferenceSpeakers)),
    publishedOrFallback(getPublishedMedia, published(conferenceMedia)),
  ]);
  return {
    sessions,
    speakers,
    media,
    workshops: getPublicWorkshops(),
  };
}
