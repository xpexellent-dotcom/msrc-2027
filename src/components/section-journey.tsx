import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";

const copy = {
  en: { label: "Explore the conference sections", sections: ["The conference", "Participation", "Program", "Our legacy"] },
  ar: { label: "استكشف أقسام المؤتمر", sections: ["عن المؤتمر", "المشاركة", "البرنامج", "النسخ السابقة"] },
} as const;
const destinations = ["about", "participate", "program", "legacy"] as const;

/** Explicit section links glide to content; wheel, touch, and keyboard scrolling stay native. */
export function SectionJourney({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <nav className="section-journey" aria-label={text.label}>
      <div className="section-journey-links">
        {destinations.map((id, index) => <Link key={id} href={`#${id}`}>{text.sections[index]}</Link>)}
      </div>
    </nav>
  );
}
