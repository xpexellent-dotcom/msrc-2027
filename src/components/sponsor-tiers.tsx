import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import type { Locale } from "@/lib/i18n";

/** Neutral Brand slots stand in for partners that have not yet been announced. */
export function SponsorTiers({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const copy = peopleAndPartnersCopy[locale].sponsors;
  return (
    <div className={`sponsor-tiers${compact ? " sponsor-tiers--compact" : ""}`} data-testid="sponsor-tiers">
      {copy.tiers.map((tier, index) => (
        <section className={`sponsor-tier sponsor-tier--${["platinum", "gold", "silver"][index]}`} aria-label={tier} key={tier}>
          <div className="sponsor-tier-heading"><h2>{tier}</h2></div>
          <div className="sponsor-brand-grid">
            {Array.from({ length: index + 1 }, (_, slot) => (
              <div className="sponsor-brand" key={slot}>
                <span className="sponsor-brand-word" lang="en" dir="ltr">Brand</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
