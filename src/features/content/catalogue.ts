import { conferenceConfig } from "@/config/conference";
import type { ProgrammeDay, PublicSession, PublicSpeaker } from "@/content/conference-experiences";
import type { Locale } from "@/lib/i18n";
import { localizedContent, type PublishedContent } from "./published";

const sessionTypes: Record<string, Record<Locale, string>> = {
  talk: { en: "Talk", ar: "محاضرة" }, panel: { en: "Panel", ar: "جلسة حوارية" },
  workshop: { en: "Workshop", ar: "ورشة عمل" }, break: { en: "Break", ar: "استراحة" }, other: { en: "Other", ar: "أخرى" },
};

export function contentSpeaker(item: PublishedContent, locale: Locale): PublicSpeaker {
  const fields = item.fields;
  return { slug: item.id, publication: "approved", contentLocale: locale,
    name: localizedContent(fields, "name", locale), title: localizedContent(fields, "title", locale),
    institution: localizedContent(fields, "affiliation", locale), biography: localizedContent(fields, "bio", locale),
    portrait: item.media?.src ?? null, portraitAlt: { en: item.media?.altEn ?? "", ar: item.media?.altAr ?? "" },
    portraitPosition: item.media ? `${item.media.focalX}% ${item.media.focalY}%` : undefined,
    professionalLinks: fields.links.map((href) => ({ href, label: new URL(href).hostname })) };
}
export function contentSession(item: PublishedContent, locale: Locale): PublicSession {
  const fields = item.fields;
  const day: ProgrammeDay = fields.day === conferenceConfig.dates?.day1 ? "day1" : fields.day === conferenceConfig.dates?.day2 ? "day2" : fields.day as ProgrammeDay;
  // Staff-authored days are preserved exactly; stored clocks are Riyadh local time.
  const instant = (clock: string) => fields.day && clock ? `${fields.day}T${clock}:00+03:00` : null;
  return { slug: item.id, publication: "approved", contentLocale: /[\u0600-\u06ff]/.test(localizedContent(fields, "title", locale)) ? "ar" : "en", day, sortOrder: fields.sortOrder,
    title: localizedContent(fields, "title", locale), description: localizedContent(fields, "description", locale),
    startAt: instant(fields.startTime), endAt: instant(fields.endTime), room: localizedContent(fields, "room", locale) || null,
    category: { id: fields.type, label: sessionTypes[fields.type] ?? { en: fields.type, ar: fields.type } }, topic: "", speakerSlugs: fields.speakerIds,
    objectives: [], recordingSlug: null };
}
