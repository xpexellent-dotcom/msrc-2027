import type { Locale } from "@/lib/i18n";

/** Graphic ornament only; ordered lists already expose their item count and order. */
export function DecorativeNumeral({ className, value, locale }: { className: string; value: string; locale: Locale }) {
  return <span className={className} aria-hidden="true"><svg viewBox="0 0 140 100" direction="ltr" aria-hidden="true" focusable="false"><text x={locale === "ar" ? "140" : "0"} y="80" textAnchor={locale === "ar" ? "end" : "start"} fontSize="100">{value}</text></svg></span>;
}
