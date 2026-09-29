"use client";

import { useParams } from "next/navigation";
import { defaultLocale, dictionaries, isLocale } from "@/lib/i18n";

export default function Loading() {
  const { locale: requestedLocale } = useParams<{ locale: string }>();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  return (
    <div className="message-page site-container" role="status">
      <p>{dictionaries[locale].loading}</p>
      <div className="loading-line" aria-hidden="true" />
    </div>
  );
}
