import { useId } from "react";
import type { Locale } from "@/lib/i18n";

/** The organizer selected 7 for this illustrative graphic, not an approved hour count. */
const illustrativeCmeHours = 7;

export function BenefitArtwork({ index, locale }: { index: number; locale: Locale }) {
  const gradient = useId();
  if (index === 3) return <div className="benefit-cme" role="img" aria-label={locale === "ar" ? "٧ ساعات تعليم طبي مستمر: مثال بصري فقط، العدد غير مؤكد" : "7 CME hours: illustrative only, hours unconfirmed"}>
    <span className="benefit-cme-number" aria-hidden="true">{locale === "ar" ? "٧" : illustrativeCmeHours}</span>
    <span className="benefit-cme-label" aria-hidden="true">CME</span>
    <span className="benefit-cme-note" aria-hidden="true">{locale === "ar" ? "مثال بصري" : "Illustrative"}</span>
  </div>;
  const paths = [
    <g key="research"><path d="m37 15 17 11-13 20-17-11 13-20Zm-4 17-6 10m17-2 6 4M22 69h44M44 70V60M58 34a19 19 0 0 1-5 37M28 54h22" /><circle cx="57" cy="32" r="5" /></g>,
    <g key="practice"><path d="m27 25 19-10 20 10-20 11-19-11Zm0 0v28l19 12 20-12V25M46 36v29M18 39l-8 8 8 8m56-16 8 8-8 8" /></g>,
    <g key="community"><circle cx="45" cy="25" r="10" /><path d="M28 69V56a17 17 0 0 1 34 0v13M20 22a9 9 0 0 0 0 18M70 22a9 9 0 0 1 0 18M11 65V55a13 13 0 0 1 10-13m58 23V55a13 13 0 0 0-10-13" /></g>,
    null,
    <g key="certificate"><path d="M58 68H21V16h47v26M30 29h29M30 39h20M30 49h12" /><circle cx="62" cy="56" r="12" /><path d="m53 65-3 15 12-6 12 6-3-15m-15-9 4 4 8-8" /></g>,
    <g key="award"><path d="M28 17h34v21a17 17 0 0 1-34 0V17ZM28 25H16v12a14 14 0 0 0 15 14m31-26h12v12a14 14 0 0 1-15 14M45 55v16M30 76h30M39 71h12" /></g>,
  ];
  return <svg className="benefit-artwork" viewBox="0 0 90 90" fill="none" aria-hidden="true">
    <defs><linearGradient id={gradient} x1="10" y1="12" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#a181c4" /><stop offset=".5" stopColor="#633b91" /><stop offset="1" stopColor="#c9a24a" /></linearGradient></defs>
    <g stroke={`url(#${gradient})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">{paths[index] ?? paths[0]}</g>
  </svg>;
}
