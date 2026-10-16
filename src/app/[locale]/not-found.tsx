"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { publicSitemap } from "@/content/public-site";
import { defaultLocale, dictionaries, isLocale } from "@/lib/i18n";

// Published destinations a lost visitor most often wants, in the footer's wording.
const suggestions = ["program", "participation", "dates", "contact"] as const;

export default function NotFound() {
  const { locale: requestedLocale } = useParams<{ locale: string }>();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const copy = dictionaries[locale];
  const pages = suggestions.map((id) => publicSitemap.find((page) => page.id === id)!);
  return (
    <section className="not-found-stage">
      <svg className="not-found-lines" viewBox="0 0 1200 700" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        {Array.from({ length: 14 }, (_, index) => <path key={index} d={`M ${-120 + index * 28} 760 C ${180 + index * 22} 380, ${820 - index * 18} 620, ${1320 - index * 10} ${-40 + index * 14}`} />)}
      </svg>
      <div className="message-page site-container">
        {/* No dir override: an LTR block would pin the Arabic eyebrow to the wrong edge. */}
        <p className="eyebrow">{locale === "ar" ? "٤٠٤" : "404"}</p>
        <h1>{copy.notFoundTitle}</h1>
        <p>{copy.notFoundDescription}</p>
        <div className="message-actions">
          <ButtonLink href={`/${locale}`} variant="gold">{copy.home}</ButtonLink>
        </div>
        <nav className="not-found-links" aria-label={locale === "ar" ? "صفحات مقترحة" : "Suggested pages"}>
          <ul>
            {pages.map((page) => <li key={page.id}><Link href={`/${locale}${page.previewHref}`}>{page.label[locale]}</Link></li>)}
          </ul>
        </nav>
      </div>
    </section>
  );
}
