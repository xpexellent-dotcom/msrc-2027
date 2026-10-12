import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { VenuePhotoGallery } from "@/components/venue-photo-gallery";
import { VenueArrivalJourney } from "@/components/venue-arrival-journey";
import { VenueGeographicMap } from "@/components/venue-geographic-map";
import { VenueIcon } from "@/components/venue-icon";
import { conferenceConfig } from "@/config/conference";
import { datesVenueCopy } from "@/content/dates-venue";
import { venueTravelCopy } from "@/content/venue-travel";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { isLocale } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";
import { venueMapLinks } from "@/lib/venue-travel";

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
  const venue = conferenceConfig.venue;
  const travel = venueTravelCopy[locale];

  return (
    <>
      <section className="venue-gallery-hero" aria-labelledby="dates-page-title">
        <div className="venue-photo-header premium-photo-hero">
          <div className="premium-hero-image" aria-hidden="true"><Image src="/media/msrc-demo/king-faisal-venue.jpg" alt="" fill priority sizes="100vw" /></div>
        <Container>
          <nav aria-label={copy.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.page}</span></li>
            </ol>
          </nav>
            <div className="venue-hero-intro">
              <h1 id="dates-page-title">{locale === "en" ? <><span>Your way</span><br /> <span className="premium-title-accent">to MSRC.</span></> : <><span>طريقك</span><br /> <span className="premium-title-accent">إلى المؤتمر.</span></>}</h1>
              <p className="dates-lead">{copy.lead}</p>
            </div>
        </Container>
        </div>
        <div className="venue-gallery-stage">
          <AmbientArtwork variant="paths" />
          <Container>
          <div className="venue-hero-composition">
            {venue && <div id="venue-orientation" tabIndex={-1} className="venue-hero-map">
              <VenueGeographicMap locale={locale} variant="hero" />
              <nav className="venue-map-links" aria-label={travel.mapLinksLabel}>
                {venueMapLinks(venue).map(({ provider, href }) => <a key={provider} tabIndex={0} className={`button button--secondary${provider === "google" ? " dates-directions-link" : ""}`} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={provider === "google" ? copy.directionsLabel : `${travel.openMap} ${venue.name[locale]} ${travel.inProvider} ${travel.providers[provider]} (${travel.newTab})`}>{travel.providers[provider]}<VenueIcon name="arrow" /></a>)}
              </nav>
            </div>}
            <VenuePhotoGallery locale={locale} />
          </div>
          {venue && <div className="venue-journey-invitation"><ButtonLink href={`/${locale}/dates-venue#journey-airport`} className="venue-hero-action" variant="gold">
            {locale === "ar" ? "ابدأ رحلتك" : "Begin your journey"}
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </ButtonLink></div>}
          </Container>
        </div>
      </section>

      {venue && <VenueArrivalJourney locale={locale} venue={venue} />}

      <section id="schedule" tabIndex={-1} className="venue-gallery-footer" aria-label={copy.scheduleTitle}>
        <Container><div className="venue-gallery-footer-grid">
            <p className="dates-body">{copy.scheduleBody}</p>
            <ButtonLink href={`/${locale}/program`} className="dates-program-link" variant="secondary">{copy.program}</ButtonLink>
        </div></Container>
      </section>
    </>
  );
}
