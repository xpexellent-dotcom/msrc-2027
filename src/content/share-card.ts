import type { Locale } from "@/lib/i18n";

export const shareCardSize = { width: 1200, height: 630 } as const;
export const shareCardRevision = "conference-brand";
export const shareCardDomain = "msrc2027.com";

export const shareCardCopy = {
  en: {
    title: "The 5th Medical Students Research Conference",
    institution: "King Abdulaziz University · Jeddah",
  },
  ar: {
    title: "المؤتمر الخامس لأبحاث طلاب الطب",
    institution: "جامعة الملك عبدالعزيز · جدة",
  },
} satisfies Record<Locale, { title: string; institution: string }>;
