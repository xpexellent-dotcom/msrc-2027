import { HeroMedia, HeroMediaControls } from "@/components/hero-media";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionJourney } from "@/components/section-journey";
import { ConferenceCountdown } from "@/components/conference-countdown";
import { conferenceConfig } from "@/config/conference";
import { homepageAssets, homepageCopy } from "@/content/public-site";
import { formatIndex, type Locale } from "@/lib/i18n";
import type { PreviewHeroVideo } from "@/lib/media-policy";
import { formatConferenceDateRange } from "@/lib/conference-dates";

export type HomepageMediaPreview = { video: PreviewHeroVideo; poster: string; caption: string };

export function HomePageContent({ locale, media }: { locale: Locale; media?: HomepageMediaPreview }) {
  const copy = homepageCopy[locale];
  return (
    <div className="homepage-journey">
      <section id="top" tabIndex={-1} className="conference-hero" aria-labelledby="hero-title">
        <HeroMedia locale={locale} video={media?.video ?? homepageAssets.heroVideo} posterSrc={media?.poster ?? homepageAssets.heroPoster} allowPreview={Boolean(media)} playbackPolicy="autoplay">
        <Container className="hero-content">
          <div className="hero-topline"><span>{copy.kicker}</span><span dir="ltr" lang="en">MSRC / 2027</span></div>
          <HeroMediaControls />
          <div className="hero-layout">
          <div className="hero-editorial">
            <p className="hero-location">{copy.institution} <span aria-hidden="true">/</span> {copy.city}</p>
            <h1 id="hero-title"><span>{copy.title[0]}</span><span>{copy.title[1]}</span></h1>
            <p className="hero-lead">{copy.lead}</p>
            <div className="hero-actions">
              <ButtonLink href="#about" variant="gold">{copy.explore}<svg className="directional-arrow hero-action-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></ButtonLink>
              <Link className="hero-secondary" href="#program">{copy.programLink}</Link>
            </div>
          </div>
            {conferenceConfig.dates && <ConferenceCountdown dates={conferenceConfig.dates} locale={locale} dateRange={formatConferenceDateRange(conferenceConfig.dates, locale)} />}
          </div>
          <div className="hero-caption"><span>{copy.editionLabel}</span><span>{media?.caption ?? copy.posterCaption}</span></div>
        </Container>
        </HeroMedia>
      </section>
      <SectionJourney locale={locale} />
      <Container>
        <dl id="event-details" tabIndex={-1} className="event-strip">
          <div><dt>{copy.dateLabel}</dt><dd>{conferenceConfig.dates ? formatConferenceDateRange(conferenceConfig.dates, locale) : copy.pending}</dd></div>
          <div><dt>{copy.venueLabel}</dt><dd>{copy.pending}</dd></div>
          <div className="event-strip-status"><dt className="sr-only">{copy.participationLabel}</dt><dd><StatusBadge tone="neutral">{copy.participationStatus}</StatusBadge></dd></div>
        </dl>
      </Container>
      <section id="about" tabIndex={-1} className="editorial-section intro-section" aria-labelledby="about-title">
        <Container className="intro-grid">
          <SectionHeading eyebrow={copy.aboutEyebrow} title={copy.aboutTitle} id="about-title" />
          <div className="intro-body"><p className="intro-statement">{copy.aboutBody}</p><p>{copy.aboutNote}</p><div className="intro-link"><ButtonLink href={`/${locale}/about`} variant="secondary">{copy.aboutLink}</ButtonLink></div></div>
        </Container>
      </section>
      <section id="participate" tabIndex={-1} className="editorial-section pathways-section" aria-labelledby="pathways-title">
        <Container>
          <div className="section-introduction"><SectionHeading eyebrow={copy.pathwaysEyebrow} title={copy.pathwaysTitle} id="pathways-title" /><p>{copy.pathwaysBody}</p></div>
          <div className="pathway-list">
            {copy.pathways.map((pathway, index) => (
              <article className="pathway-row" key={pathway.category}>
                <span className="pathway-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span>
                <div className="pathway-title"><p>{pathway.category}</p><h3>{pathway.title}</h3></div>
                <p className="pathway-description">{pathway.description}</p>
                <StatusBadge tone="neutral">{copy.closed}</StatusBadge>
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section id="program" tabIndex={-1} className="editorial-section program-section" aria-labelledby="program-title">
        <Container className="program-grid">
          <div><SectionHeading eyebrow={copy.programEyebrow} title={copy.programTitle} id="program-title" inverse /><p className="program-intro">{copy.programBody}</p><p className="program-disclaimer">{copy.illustrative}</p></div>
          <div className="program-list">
            {copy.programRows.map((row, index) => (
              <article className="program-row" key={row.format}>
                <div className="program-row-top"><span>{row.format}</span><span aria-hidden="true">{formatIndex(index + 1, locale)}</span></div>
                <h3>{row.title}</h3><p>{row.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section id="legacy" tabIndex={-1} className="editorial-section legacy-section" aria-labelledby="legacy-title">
        <Container className="legacy-grid">
          <div className="legacy-art" aria-hidden="true"><div className="legacy-art-years" dir="ltr"><span>2026</span><span>2027</span></div><div className="legacy-arch"/><div className="legacy-art-caption"><span>MSRC</span><span>{copy.legacyArtLabel}</span></div></div>
          <div className="legacy-copy"><SectionHeading eyebrow={copy.legacyEyebrow} title={copy.legacyTitle} id="legacy-title" /><p>{copy.legacyBody}</p><p className="legacy-note">{copy.legacyNote}</p></div>
        </Container>
      </section>
      <section className="closing-section" aria-labelledby="closing-title">
        <Container className="closing-grid"><h2 id="closing-title">{copy.endingTitle}</h2><div><p>{copy.endingBody}</p><ButtonLink href="#top" variant="secondary">{copy.backToTop}</ButtonLink></div></Container>
      </section>
    </div>
  );
}
