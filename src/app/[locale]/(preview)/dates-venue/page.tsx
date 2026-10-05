import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/ui/reveal";
import { conferenceConfig } from "@/config/conference";
import { datesVenueCopy } from "@/content/dates-venue";
import { formatConferenceDate, formatConferenceDateRange } from "@/lib/conference-dates";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";

type DatesVenuePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: DatesVenuePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = datesVenueCopy[locale];
  const description = `${conferenceConfig.dates ? `${formatConferenceDateRange(conferenceConfig.dates, locale)}. ` : ""}${copy.metadataDescription}`;
  return {
    ...localizedPageMetadata(locale, "/dates-venue", copy.metadataTitle, description),
    title: copy.metadataTitle,
    description,
  };
}

export default async function DatesVenuePage({ params }: DatesVenuePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = datesVenueCopy[locale];
  const dates = conferenceConfig.dates;
  const venue = conferenceConfig.venue;

  return (
    <>
      <section className="dates-hero" aria-labelledby="dates-page-title">
        <Container>
          <nav aria-label={copy.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.page}</span></li>
            </ol>
          </nav>
          <div className="dates-hero-grid">
            <div>
              <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{copy.eyebrow}</p>
              <h1 id="dates-page-title">{copy.title}</h1>
              <p className="dates-lead">{copy.lead}</p>
            </div>
            <div className="dates-calendar" aria-labelledby="confirmed-days-title">
              <h2 id="confirmed-days-title" className="sr-only">{copy.datesHeading}</h2>
              {dates ? (
                <>
                  <StatusBadge tone="success">{copy.confirmed}</StatusBadge>
                  <ol className="dates-day-list">
                    {[{ label: copy.day1, date: dates.day1 }, { label: copy.day2, date: dates.day2 }].map((day) => (
                      <li key={day.date}>
                        <span>{day.label}</span>
                        <time dateTime={day.date}>{formatConferenceDate(day.date, locale)}</time>
                      </li>
                    ))}
                  </ol>
                  {/* A plain file link: it downloads without JavaScript and opens in the visitor's calendar app. */}
                  <a className="text-link dates-calendar-link" href={`/${locale}/msrc-2027.ics`} download="msrc-2027.ics">{copy.addToCalendar}</a>
                </>
              ) : <p>{copy.datesPending}</p>}
            </div>
          </div>
        </Container>
      </section>

      <section id="venue" tabIndex={-1} className="editorial-section dates-location" aria-labelledby="venue-title">
        <Container><Reveal className="dates-content-grid" stagger>
          <div>
            <SectionHeading eyebrow={copy.locationEyebrow} title={copy.locationTitle} id="venue-title" />
            <p className="dates-body">{copy.locationBody}</p>
            {venue && <a className="text-link dates-directions-link" href={venue.directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.directionsLabel}>{copy.directions}<span className="directional-arrow" aria-hidden="true"> ↗</span></a>}
          </div>
          <dl className="dates-location-details">
            <div><dt>{copy.city}</dt><dd>{copy.cityValue}</dd></div>
            <div><dt>{copy.host}</dt><dd>{copy.hostValue}</dd></div>
            <div><dt>{copy.venue}</dt><dd>{venue?.name[locale] ?? copy.venuePending}</dd></div>
            {venue && <div><dt>{copy.address}</dt><dd>{venue.address.streetAddress[locale]}{locale === "ar" ? "، جدة " : ", Jeddah "}{venue.address.postalCode}</dd></div>}
          </dl>
        </Reveal></Container>
      </section>

      <section id="schedule" tabIndex={-1} className="editorial-section dates-schedule" aria-labelledby="schedule-title">
        <Container><Reveal className="dates-content-grid" stagger>
          <SectionHeading eyebrow={copy.scheduleEyebrow} title={copy.scheduleTitle} id="schedule-title" />
          <div>
            <p className="dates-body">{copy.scheduleBody}</p>
            <ButtonLink href={`/${locale}/#program`} className="dates-program-link" variant="secondary">{copy.program}</ButtonLink>
            <div className="dates-closed-note">
              <StatusBadge tone="neutral">{copy.closed}</StatusBadge>
            </div>
          </div>
        </Reveal></Container>
      </section>
    </>
  );
}
