import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/ui/reveal";
import { VenueTravelDetails } from "@/components/venue-travel-details";
import { ConferenceDayLinks } from "@/components/conference-day-links";
import { VenueIcon } from "@/components/venue-icon";
import { conferenceConfig } from "@/config/conference";
import { datesVenueCopy } from "@/content/dates-venue";
import { venueTravelCopy } from "@/content/venue-travel";
import { formatConferenceDateRange } from "@/lib/conference-dates";
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
      <section className="dates-hero premium-photo-hero" aria-labelledby="dates-page-title">
        <div className="premium-hero-image" aria-hidden="true"><Image src="/media/msrc-demo/king-faisal-venue.jpg" alt="" fill sizes="100vw" priority /></div>
        <Container>
          <nav aria-label={copy.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.page}</span></li>
            </ol>
          </nav>
          <div className="dates-hero-grid">
            <div>
              <h1 id="dates-page-title">{locale === "en" ? <>Two days in <span className="premium-title-accent">Jeddah.</span></> : <>يومان في <span className="premium-title-accent">جدة.</span></>}</h1>
              <p className="dates-lead">{copy.lead}</p>
            </div>
            <div className="dates-calendar" aria-labelledby="confirmed-days-title">
              <h2 id="confirmed-days-title" className="sr-only">{copy.datesHeading}</h2>
              {dates ? (
                <>
                  <p className="dates-calendar-label"><VenueIcon name="calendar" />{copy.confirmed}</p>
                  <ConferenceDayLinks locale={locale} />
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
            <SectionHeading title={copy.locationTitle} id="venue-title" />
            <p className="dates-body">{copy.locationBody}</p>
            {venue && <a className="button button--primary dates-directions-link" href={venue.directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.directionsLabel}>{copy.directions}<VenueIcon name="arrow" /></a>}
          </div>
          <dl className="dates-location-details">
            <div><dt><VenueIcon name="city" />{copy.city}</dt><dd>{copy.cityValue}</dd></div>
            <div><dt><VenueIcon name="host" />{copy.host}</dt><dd>{copy.hostValue}</dd></div>
            <div><dt><VenueIcon name="venue" />{copy.venue}</dt><dd>{venue?.name[locale] ?? copy.venuePending}</dd></div>
            {venue && <div><dt><VenueIcon name="address" />{copy.address}</dt><dd>{venue.address.streetAddress[locale]}{locale === "ar" ? "، جدة " : ", Jeddah "}{venue.address.postalCode}</dd></div>}
          </dl>
        </Reveal></Container>
      </section>

      {venue ? (
        <section id="getting-there" tabIndex={-1} className="editorial-section dates-travel" aria-labelledby="getting-there-title">
          <Container>
            <SectionHeading title={venueTravelCopy[locale].title} id="getting-there-title" />
            <p className="dates-body">{venueTravelCopy[locale].intro}</p>
            <VenueTravelDetails venue={venue} locale={locale} />
          </Container>
        </section>
      ) : null}

      <section id="schedule" tabIndex={-1} className="editorial-section dates-schedule" aria-labelledby="schedule-title">
        <Container><Reveal className="dates-content-grid" stagger>
          <SectionHeading title={copy.scheduleTitle} id="schedule-title" />
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
