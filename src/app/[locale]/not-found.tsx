"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, dictionaries, isLocale } from "@/lib/i18n";

export default function NotFound() {
  const { locale: requestedLocale } = useParams<{ locale: string }>();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const copy = dictionaries[locale];
  return (
    <section className="message-page site-container">
      <p className="eyebrow" dir="ltr">{locale === "ar" ? "٤٠٤" : "404"}</p>
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundDescription}</p>
      <Link className="action-link" href={`/${locale}`}>{copy.home}</Link>
    </section>
  );
}
