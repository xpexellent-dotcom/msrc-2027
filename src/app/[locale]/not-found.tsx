"use client";

import { useParams } from "next/navigation";
import { NotFoundContent } from "@/components/not-found-content";
import { defaultLocale, isLocale } from "@/lib/i18n";

// In-route notFound() boundaries still support client navigation. Unmatched URLs
// use global-not-found.tsx, whose full document is rendered on the server.
export default function NotFound() {
  const { locale } = useParams<{ locale: string }>();
  return <NotFoundContent locale={isLocale(locale) ? locale : defaultLocale} />;
}
