import type { Locale } from "@/lib/i18n";

export type HomepageSponsor = Readonly<{
  id: string;
  name: Readonly<Record<Locale, string>>;
  logo: Readonly<{ src: `/${string}`; width: number; height: number }>;
}>;

/** ORG-072: illustrative-only content, never real sponsor identities. */
export const sponsorBeltCopy = {
  en: { caption: "Illustrative logos — sponsors to be announced", placeholder: "Sponsor name" },
  ar: { caption: "شعارات توضيحية — سيُعلن الرعاة لاحقًا", placeholder: "اسم الراعي" },
} as const;
