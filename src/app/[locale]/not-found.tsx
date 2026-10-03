"use client";

import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { defaultLocale, dictionaries, isLocale } from "@/lib/i18n";

export default function NotFound() {
  const { locale: requestedLocale } = useParams<{ locale: string }>();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const copy = dictionaries[locale];
  return (
    <section className="message-page site-container">
      {/* No dir override: an LTR block would pin the Arabic eyebrow to the wrong edge. */}
      <p className="eyebrow">{locale === "ar" ? "٤٠٤" : "404"}</p>
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundDescription}</p>
      <div className="message-actions">
        <ButtonLink href={`/${locale}`}>{copy.home}</ButtonLink>
      </div>
    </section>
  );
}
