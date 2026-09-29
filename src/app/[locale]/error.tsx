"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, dictionaries, isLocale } from "@/lib/i18n";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale: requestedLocale } = useParams<{ locale: string }>();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const copy = dictionaries[locale];
  return (
    <section className="message-page site-container" role="alert">
      <h1>{copy.errorTitle}</h1>
      <p>{copy.errorDescription}</p>
      <div className="message-actions">
        <button className="action-link" onClick={reset}>{copy.retry}</button>
        <Link className="text-link" href={`/${locale}`}>{copy.home}</Link>
      </div>
    </section>
  );
}
