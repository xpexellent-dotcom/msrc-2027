import Image from "next/image";
import { HeroMedia } from "@/components/hero-media";
import { HeroScrollStage } from "@/components/hero-scroll-stage";
import { CinematicFilm, CinematicFilmLink } from "@/components/cinematic-film";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScrollScenes } from "@/components/scroll-scenes";
import { ConferenceCountdown } from "@/components/conference-countdown";
import { Reveal } from "@/components/ui/reveal";
import { HorizontalRail } from "@/components/horizontal-rail";
import { ClosingCity } from "@/components/closing-city";
import { PortraitPlaceholder } from "@/components/portrait-placeholder";
import { ResearchArtwork } from "@/components/research-artwork";
import { HistoryNumbers } from "@/components/history-numbers";
import { SpeakerAtmosphere } from "@/components/speaker-atmosphere";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { BenefitArtwork } from "@/components/benefit-artwork";
import { PathwayTrackNav } from "@/components/pathway-track-nav";
import { conferenceExpectations } from "@/content/conference-expectations";
import { conferenceConfig } from "@/config/conference";
import { homepageAssets, homepageCopy } from "@/content/public-site";
import { homepageNarrative } from "@/content/homepage-narrative";
import { cinematicCopy, demoImages } from "@/content/cinematic-demo";
import type { Locale } from "@/lib/i18n";
import type { PreviewHeroVideo } from "@/lib/media-policy";
import { formatConferenceDateRange } from "@/lib/conference-dates";

export type HomepageMediaPreview = { video: PreviewHeroVideo; poster: string; caption: string };
const Arrow = () => <svg className="directional-arrow" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function HomePageContent({ locale, media }: { locale: Locale; media?: HomepageMediaPreview }) {
  const copy = homepageCopy[locale];
  const narrative = homepageNarrative[locale];
  const demo = cinematicCopy[locale];
  const expectations = conferenceExpectations[locale];
  const dates = conferenceConfig.dates;
  const dateRange = dates ? formatConferenceDateRange(dates, locale) : copy.pending;
  const pathways = [...copy.pathways, demo.threeMinute];

  return <div className="homepage-journey cinematic-home editorial-motion-home">
    <HeroScrollStage>
    <section id="top" tabIndex={-1} className="conference-hero" aria-labelledby="hero-title">
      <HeroMedia locale={locale} video={media?.video ?? homepageAssets.heroVideo} posterSrc={media?.poster ?? homepageAssets.heroPoster} allowPreview={Boolean(media)} playbackPolicy="respect-preferences" controlsMode="video">
        <Container className="hero-content">
          <div className="hero-layout"><div className="hero-editorial">
            <h1 id="hero-title"><span>{copy.title[0]}</span>{" "}<span>{copy.title[1]}</span></h1>
            <p className="hero-conference-name">{copy.kicker}</p>
          </div></div>
          <div className="hero-bottom-grid">
            <div className="hero-introduction">
              <p className="hero-lead">{copy.lead}</p>
              <p className="hero-location"><span>{dateRange}</span><span aria-hidden="true">·</span><span>{copy.city}</span></p>
              <div className="hero-actions">
                <ButtonLink href={`/${locale}/participate`} variant="gold">{demo.join}<Arrow /></ButtonLink>
                <Link className="hero-secondary" href={`/${locale}/program`}>{narrative.programmeAction}<Arrow /></Link>
              </div>
            </div>
            {dates && <div className="hero-countdown"><ConferenceCountdown dates={dates} locale={locale} dateRange={dateRange} /></div>}
          </div>
          <div className="hero-bottom">
            <Link href="#essentials" className="hero-scroll">{narrative.scroll}<span className="scroll-line" aria-hidden="true" /></Link>
          </div>
        </Container>
      </HeroMedia>
      <CinematicFilm locale={locale} />
    </section>
    </HeroScrollStage>
    <div className="homepage-content-sheet">
    <section id="essentials" tabIndex={-1} className="date-band" aria-label={copy.editionLabel}>
      <Container className="date-band-inner"><dl id="event-details" tabIndex={-1} className="event-strip">
        <div><dt>{copy.dateLabel}</dt><dd>{dateRange}</dd></div>
        <div><dt>{copy.venueLabel}</dt><dd>{conferenceConfig.venue?.name[locale] ?? copy.pending}</dd></div>
      </dl></Container>
    </section>
    <ScrollScenes />

    <section id="participate" tabIndex={-1} className="editorial-section pathways-section" aria-labelledby="pathways-title">
      <AmbientArtwork variant="paths" />
      <Container className="pathways-layout">
        <div className="pathways-introduction">
          <SectionHeading chapter title={copy.pathwaysTitle} accents={locale === "ar" ? ["مسارك.", "مسارك"] : ["path.", "path"]} id="pathways-title" />
          <p>{copy.pathwaysBody}</p>
          <PathwayTrackNav locale={locale} tracks={pathways.map((pathway) => ({ id: `pathway-${pathway.href.slice(1)}`, label: pathway.href === "/3mt" ? "3MT" : pathway.category }))} />
          <Link className="editorial-action" href={`/${locale}/participate`}>{demo.pathwaysLink}<Arrow /></Link>
        </div>
        <div className="pathway-list">{pathways.map((pathway, index) => <article className="pathway-card" key={pathway.href} data-pathway={pathway.href} id={`pathway-${pathway.href.slice(1)}`} tabIndex={-1}>
          <div className="pathway-photo"><Image src={demoImages.pathways[index]} alt="" fill sizes="(max-width: 800px) 100vw, (max-width: 1400px) 60vw, 850px" /></div>
          <div className="pathway-card-body">
            <h3>{pathway.title}</h3>
            <div className="pathway-category"><span>{pathway.category}</span>{pathway.href !== "/registration" ? <StatusBadge tone="neutral">{copy.closed}</StatusBadge> : null}</div>
            <p className="pathway-description">{pathway.description}</p>
            <Link className="pathway-action" href={`/${locale}${pathway.href}`} aria-label={`${narrative.pathwayLink}: ${pathway.category}`}><Arrow /></Link>
          </div>
        </article>)}</div>
      </Container>
    </section>

    <section id="program" tabIndex={-1} className="editorial-section program-section" aria-labelledby="program-title">
      <AmbientArtwork variant="benefits" />
      <Container>
        <Reveal className="program-opening" stagger>
          <SectionHeading chapter title={expectations.title} accents={locale === "ar" ? ["بفضولك.", "إمكاناتك."] : ["curiosity.", "possibility."]} id="program-title" />
          <div><p>{expectations.introduction}</p><Link className="editorial-action" href={`/${locale}/participate`}>{expectations.link}<Arrow /></Link></div>
        </Reveal>
        <div className="expectations-layout">
          <ResearchArtwork />
          <div className="program-experiences">{expectations.benefits.map((benefit) => <article className="benefit-card" key={benefit.title}><BenefitArtwork icon={benefit.icon} locale={locale} /><div className="benefit-copy"><h3>{benefit.title}</h3><p>{benefit.homepageBody ?? benefit.body}</p></div></article>)}</div>
        </div>
      </Container>
    </section>

    <section id="speakers" tabIndex={-1} className="editorial-section speakers-section" aria-labelledby="speakers-title">
      <SpeakerAtmosphere />
      <Container>
        <Reveal className="section-topline" stagger><SectionHeading chapter title={narrative.speakersTitle} accents={locale === "ar" ? ["المتحدثين.", "المتحدثين"] : ["speakers.", "speakers"]} id="speakers-title" /><Link className="editorial-action" href={`/${locale}/speakers`}>{narrative.speakersLink}<Arrow /></Link></Reveal>
        <p className="section-intro-text">{narrative.speakersBody}</p>
        <HorizontalRail className="speaker-rail" locale={locale} label={demo.speakerRail}>
          {[0, 1, 2, 3].map((index) => <article className="speaker-preview-card" key={index}>
            <div className="speaker-preview-portrait"><PortraitPlaceholder variant={index} /></div>
            <div className="speaker-preview-content"><h3>{demo.speakerTitle}</h3><p>{demo.speakerPending}</p>{/* Pointer shortcut only: the section's "Meet the speakers" link already reaches this page, so the four identical placeholder cards add no keyboard or screen-reader stops. */}<Link className="speaker-preview-link" href={`/${locale}/speakers`} tabIndex={-1} aria-hidden="true"><Arrow /></Link></div>
          </article>)}
        </HorizontalRail>
      </Container>
    </section>

    <section id="legacy" tabIndex={-1} className="editorial-section legacy-section" aria-labelledby="legacy-title">
      <div className="community-image" aria-hidden="true"><Image src="/media/msrc-demo/community-majed-9804.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 60vw" /></div>
      <div className="community-flow" aria-hidden="true"><AmbientArtwork variant="people" /></div>
      <Container>
        <Reveal className="section-topline" stagger><SectionHeading chapter title={expectations.historyTitle} accents={locale === "ar" ? ["ينمو.", "يجمعنا."] : ["community.", "ambition."]} id="legacy-title" inverse /><Link className="editorial-action" href={`/${locale}/media`}>{expectations.legacyLink}<Arrow /></Link></Reveal>
        <p className="legacy-film-note">{expectations.historyBody}</p>
        <HistoryNumbers locale={locale} />
        <HorizontalRail className="gallery-rail" locale={locale} label={demo.galleryRail}>
          {demoImages.gallery.map((photo) => <figure className="gallery-card" key={photo.src}>
            <div className="gallery-photo"><Image src={photo.src} alt={photo.alt[locale]} fill style={{ objectPosition: photo.objectPosition }} sizes="(max-width: 600px) 84vw, (max-width: 1100px) 62vw, 44vw" /><span className="home-photo-edition" dir="ltr">{photo.edition}</span></div>
            <figcaption><span>{photo.caption[locale]}</span></figcaption>
          </figure>)}
        </HorizontalRail>
        <div className="legacy-links"><CinematicFilmLink locale={locale}>{narrative.filmLink}<Arrow /></CinematicFilmLink></div>
      </Container>
    </section>

    <section id="venue" tabIndex={-1} className="editorial-section home-venue-section" aria-labelledby="home-venue-title">
      <Container>
        <Reveal className="home-venue-opening" stagger><SectionHeading chapter title={expectations.venueTitle} accents={locale === "ar" ? ["جديدة."] : ["perspectives."]} id="home-venue-title" /><div><h3>{expectations.venueName}</h3><p>{expectations.venueBody}</p><Link className="editorial-action" href={`/${locale}/dates-venue`}>{expectations.venueLink}<Arrow /></Link></div></Reveal>
        <figure className="home-venue-photo"><Image src="/media/msrc-demo/king-faisal-venue.jpg" alt={expectations.venueAlt} fill sizes="(max-width: 800px) 94vw, 90vw" /><figcaption>{expectations.venueLocation}</figcaption></figure>
      </Container>
    </section>

    <section id="faq" tabIndex={-1} className="editorial-section faq-section" aria-labelledby="practical-title">
      <Container><div className="faq-grid">
        <Reveal className="faq-introduction"><SectionHeading chapter title={narrative.practicalTitle} id="practical-title" /><div className="faq-utility-links"><Link className="editorial-action" href={`/${locale}/dates-venue`}>{narrative.datesLink}<Arrow /></Link><Link className="editorial-action" href={`/${locale}/contact`}>{demo.contact}<Arrow /></Link></div></Reveal>
        <div className="faq-list" aria-label={narrative.faqLabel}>{narrative.faq.map((faq) => <details className="faq-item" key={faq.question}>
          <summary><span>{faq.question}</span><span className="faq-icon-circle"><svg className="faq-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></summary><p>{faq.answer}</p>
        </details>)}</div>
      </div></Container>
    </section>

    <ClosingCity locale={locale} video={demoImages.closing.video} poster={demoImages.closing.poster}>
      <Container><Reveal className="closing-grid" stagger><div><h2 id="closing-title">{copy.endingTitle}</h2><p className="closing-date">{dateRange} · {copy.city}</p></div><ButtonLink href={`/${locale}/participate`} variant="gold">{demo.join}<Arrow /></ButtonLink></Reveal></Container>
    </ClosingCity>
    </div>
  </div>;
}
