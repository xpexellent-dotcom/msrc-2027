import { VenueSchematicMap } from "@/components/venue-schematic-map";
import type { ConferenceVenue, VenueTravelMode, VenueVisitorInfoKey } from "@/config/conference";
import { venueTravelCopy } from "@/content/venue-travel";
import type { Locale } from "@/lib/i18n";
import { venueMapLinks } from "@/lib/venue-travel";

const modes = ["taxi", "train", "rental"] as const satisfies readonly VenueTravelMode[];
const venueDetailKeys = ["entryGate", "parking", "entrances", "accessibility", "prayerAreas", "food", "wifi"] as const satisfies readonly VenueVisitorInfoKey[];

/** ORG-034: local schematic and ordinary links; no map SDK, embed or provider prefetch. */
export function VenueTravelDetails({ venue, locale }: { venue: ConferenceVenue; locale: Locale }) {
  const copy = venueTravelCopy[locale];
  const details = venueDetailKeys.flatMap((key) => {
    const text = venue.atVenue?.[key]?.[locale]?.trim();
    return text ? [{ key, text }] : [];
  });
  const visaUrl = venue.visaInformationUrl?.trim();

  return (
    <div className="venue-travel-details">
      <VenueSchematicMap locale={locale} />
      <nav className="venue-map-links" aria-label={copy.mapLinksLabel}>
        {venueMapLinks(venue).map(({ provider, href }) => (
          <a key={provider} className="button button--secondary" href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${copy.openMap} ${venue.name[locale]} ${copy.inProvider} ${copy.providers[provider]} (${copy.newTab})`}>
            {copy.providers[provider]}<span className="directional-arrow" aria-hidden="true">↗</span>
          </a>
        ))}
      </nav>

      <section className="venue-airport" aria-labelledby="from-airport-title">
        <h3 id="from-airport-title">{copy.airportTitle}</h3>
        <div className="venue-travel-cards">
          {modes.map((mode) => {
            const travelTime = venue.travelTimes?.[mode]?.[locale]?.trim();
            return (
              <article key={mode} data-travel-mode={mode}>
                <h4>{copy.modes[mode].title}</h4>
                <p>{copy.modes[mode].body}</p>
                {travelTime ? <p className="venue-travel-time"><strong>{copy.travelTime}: </strong>{travelTime}</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      {details.length ? (
        <section id="at-venue" className="venue-arrival-details" aria-labelledby="at-venue-title">
          <h3 id="at-venue-title">{copy.atVenueTitle}</h3>
          <dl>{details.map(({ key, text }) => (
            <div key={key} data-venue-detail={key}><dt>{copy.venueDetails[key]}</dt><dd>{text}</dd></div>
          ))}</dl>
        </section>
      ) : null}

      <section id="international-attendees" className="venue-international" aria-labelledby="international-title">
        <h3 id="international-title">{copy.internationalTitle}</h3>
        <p>{copy.internationalNote} <bdi dir="ltr">(UTC+3)</bdi>.</p>
        {visaUrl ? <a className="text-link dates-directions-link venue-visa-link" href={visaUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${copy.visa} (${copy.newTab})`}>{copy.visa}<span className="directional-arrow" aria-hidden="true"> ↗</span></a> : null}
      </section>
    </div>
  );
}
