import Image from "next/image";
import { ReserveSeat } from "@/components/reserve-seat";
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
import { ResearchArtwork } from "@/components/research-artwork";
import { HistoryNumbers } from "@/components/history-numbers";
import { SpeakerAtmosphere } from "@/components/speaker-atmosphere";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { BenefitArtwork } from "@/components/benefit-artwork";
import { PortraitPlaceholder } from "@/components/portrait-placeholder";
import { conferenceExpectations } from "@/content/conference-expectations";
import { conferenceConfig } from "@/config/conference";
import { homepageAssets, homepageCopy } from "@/content/public-site";
import { homepageNarrative } from "@/content/homepage-narrative";
import { cinematicCopy, demoImages } from "@/content/cinematic-demo";
import type { Locale } from "@/lib/i18n";
import type { PreviewHeroVideo } from "@/lib/media-policy";
import { formatConferenceDateRange } from "@/lib/conference-dates";
import { SessionRow, SpeakerCard } from "@/components/conference-experiences";
import type { PublicSession, PublicSpeaker } from "@/content/conference-experiences";

import { Arrow } from "@/components/ui/arrow";
import { BrandIcon } from "@/components/brand/brand-icon";
import { Sparkle } from "@/components/brand/sparkle";
import { FlowRibbon } from "@/components/brand/flow-ribbon";
import { HeroSocialRow } from "@/components/home/hero-social-row";
import { SponsorBelt } from "@/components/home/sponsor-belt";
import { homePlaceholdersEnabled } from "@/lib/preview-placeholders";

export type HomepageMediaPreview = { video: PreviewHeroVideo; poster: string; caption: string };

export function HomePageContent({ locale, media, speakers = [], sessions = [] }: { locale: Locale; media?: HomepageMediaPreview; speakers?: readonly PublicSpeaker[]; sessions?: readonly PublicSession[] }) {
  const copy = homepageCopy[locale];
  const narrative = homepageNarrative[locale];
  const demo = cinematicCopy[locale];
  const expectations = conferenceExpectations[locale];
  const dates = conferenceConfig.dates;
  const dateRange = dates ? formatConferenceDateRange(dates, locale) : conferenceConfig.monthLabel[locale];
  const placeholders = homePlaceholdersEnabled();
  const pathways = [...copy.pathways, demo.threeMinute];

  return <div className="homepage-journey cinematic-home editorial-motion-home">
    <HeroScrollStage>
    <section data-header-section="dark" id="top" tabIndex={-1} className="conference-hero" aria-labelledby="hero-title">
      <HeroMedia locale={locale} video={media?.video ?? homepageAssets.heroVideo} posterSrc={media?.poster ?? homepageAssets.heroPoster} allowPreview={Boolean(media)} playbackPolicy="respect-preferences" controlsMode="video">
        <Container className="hero-content">
          <div className="hero-layout"><div className="hero-editorial">
            <p className="hero-conference-name"><Sparkle size={14} />{copy.kicker}</p>
            <h1 id="hero-title"><span>{copy.title[0]}</span>{" "}<span>{copy.title[1]}</span></h1>
          </div></div>
          <div className="hero-bottom-grid">
            <div className="hero-introduction">
              <p className="hero-location"><span>{dateRange}</span><span aria-hidden="true">·</span><span>{copy.city}</span></p>
              <div className="hero-actions">
                <ReserveSeat locale={locale} label={demo.join} />
                <ButtonLink variant="ivory" href={`/${locale}/program`}>{narrative.programmeAction}<Arrow /></ButtonLink>
              </div>
              <HeroSocialRow locale={locale} placeholders={placeholders} />
            </div>
            <div className="hero-countdown"><ConferenceCountdown target={conferenceConfig.countdownTarget} locale={locale} dateRange={dateRange} pauseWhenHidden /></div>
          </div>
        </Container>
      </HeroMedia>
      <FlowRibbon edge="bottom" />
      <CinematicFilm locale={locale} />
    </section>
    </HeroScrollStage>
    <div className="homepage-content-sheet">
    <ScrollScenes />
    {placeholders && homepageAssets.sponsors.length === 0 ? <SponsorBelt locale={locale} /> : null}

    <section data-header-section="light" id="participate" tabIndex={-1} className="editorial-section pathways-section" aria-labelledby="pathways-title">
      <AmbientArtwork variant="flow" figure="paths" />
      <Container className="pathways-layout">
        <div className="pathways-introduction">
          <SectionHeading chapter title={copy.pathwaysTitle} accents={locale === "ar" ? ["مسارك.", "مسارك"] : ["path.", "path"]} id="pathways-title" />
        </div>
        <Reveal className="pathway-list path-bento" stagger="cascade">{pathways.map((pathway, index) => {
          const slug = pathway.href.slice(1);
          const attend = index === 0;
          const icon = (["13-collaboration", "06-publications", "19-workshops", "20-hackathon", "15-schedule"] as const)[index];
          return <article className={`pathway-card path-tile path-tile--${slug}`} key={pathway.href} data-pathway={pathway.href} id={`pathway-${slug}`}>
            <div className="pathway-photo"><Image src={demoImages.pathways[index]} alt="" fill sizes={attend || index === 4 ? "(max-width: 800px) 100vw, 900px" : "(max-width: 800px) 100vw, 540px"} /></div><div className="path-tile-top"><BrandIcon name={icon} size={40} /><Arrow /></div>
            <h3 className="pathway-name"><Link className="pathway-action" href={`/${locale}${pathway.href}`} aria-describedby={`pathway-${slug}-kicker`}>{pathway.category}</Link></h3>
            <p className="pathway-kicker" id={`pathway-${slug}-kicker`}>{pathway.title}</p>
            {attend ? <><p className="path-tile-description">{pathway.description}</p><span className="path-cue" aria-hidden="true">{narrative.pathwayLink}<Arrow /></span></> : <StatusBadge tone="neutral">{copy.closed}</StatusBadge>}
          </article>;
        })}</Reveal>
      </Container>
    </section>

    <section data-header-section="light" id="program" tabIndex={-1} className="editorial-section program-section" aria-labelledby="program-title">
      <AmbientArtwork variant="flow" figure="program" />
      <Container>
        <Reveal className="program-opening" stagger>
          <SectionHeading chapter title={expectations.title} accents={locale === "ar" ? ["بفضولك.", "إمكاناتك."] : ["curiosity.", "possibility."]} id="program-title" />
          <div><p>{expectations.introduction}</p><Link className="editorial-action" href={`/${locale}/participate`}>{expectations.link}<Arrow /></Link></div>
        </Reveal>
        <div className="expectations-layout">
          <ResearchArtwork />
          <Reveal className="program-experiences" stagger="cascade">{expectations.benefits.map((benefit) => <article className="benefit-card" key={benefit.title}><BenefitArtwork icon={benefit.icon} locale={locale} variant="brand" /><div className="benefit-copy"><h3>{benefit.title}</h3><p>{benefit.homepageBody ?? benefit.body}</p></div></article>)}</Reveal>
        </div>
        {sessions.length ? <div className="public-home-programme" data-testid="home-published-programme">{sessions.slice(0, 4).map((session) => <SessionRow locale={locale} session={session} speakers={speakers} key={session.slug} />)}<Link className="editorial-action" href={`/${locale}/program`}>{narrative.programmeLink}<Arrow /></Link></div> : null}
      </Container>
    </section>

    <section data-header-section="light" id="speakers" tabIndex={-1} className="editorial-section speakers-section" aria-labelledby="speakers-title">
      <SpeakerAtmosphere />
      <Container>
        <Reveal className="section-topline" stagger><SectionHeading chapter title={narrative.speakersTitle} accents={locale === "ar" ? ["المتحدثين.", "المتحدثين"] : ["speakers.", "speakers"]} id="speakers-title" /><Link className="editorial-action" href={`/${locale}/speakers`}>{narrative.speakersLink}<Arrow /></Link></Reveal>
        {!speakers.length ? <p className="section-intro-text">{narrative.speakersBody}</p> : null}
        {speakers.length ? <div className="speaker-grid public-home-speakers" data-testid="home-published-speakers">{speakers.slice(0, 4).map((speaker) => <SpeakerCard key={speaker.slug} locale={locale} speaker={speaker} />)}</div> : <HorizontalRail className="speaker-rail" locale={locale} label={demo.speakerRail}>
          {[0, 1, 2, 3].map((index) => <article className="speaker-preview-card" key={index}>
            <div className="speaker-preview-portrait"><PortraitPlaceholder variant={index} /></div>
            <div className="speaker-preview-content"><h3>{demo.speakerTitle}</h3><p>{demo.speakerPending}</p>{/* Pointer shortcut only: the section's "Meet the speakers" link already reaches this page, so the four identical placeholder cards add no keyboard or screen-reader stops. */}<Link className="speaker-preview-link" href={`/${locale}/speakers`} tabIndex={-1} aria-hidden="true"><Arrow /></Link></div>
          </article>)}
        </HorizontalRail>}
      </Container>
    </section>

    <section data-header-section="dark" id="legacy" tabIndex={-1} className="editorial-section legacy-section" aria-labelledby="legacy-title">
      <div className="community-image" aria-hidden="true"><Image src="/media/msrc-demo/community-majed-9804.jpg" alt="" fill sizes="100vw" /></div>
      <div className="community-flow" aria-hidden="true"><AmbientArtwork variant="flow" figure="people" /></div>
      <Container>
        <Reveal className="section-topline" stagger><SectionHeading chapter title={expectations.historyTitle} accents={locale === "ar" ? ["ينمو.", "يجمعنا."] : ["community.", "ambition."]} id="legacy-title" inverse /><Link className="editorial-action" href={`/${locale}/media`}>{expectations.legacyLink}<Arrow /></Link></Reveal>
        <p className="legacy-film-note">{expectations.historyBody}</p>
        <HistoryNumbers locale={locale} />
        <HorizontalRail className="gallery-rail" locale={locale} label={demo.galleryRail}>
          {demoImages.gallery.map((photo) => <figure className="gallery-card" key={photo.src}>
            <div className="gallery-photo"><Image src={photo.src} alt={photo.alt[locale]} fill style={{ objectPosition: photo.objectPosition }} sizes="(max-width: 800px) min(calc(100vw - max(1.25rem, 3.2vw) - 4rem), 34rem), min(52vw, 52rem)" /><span className="home-photo-edition" dir="ltr">{photo.edition}</span></div>
            <figcaption><span>{photo.caption[locale]}</span></figcaption>
          </figure>)}
        </HorizontalRail>
        <div className="legacy-links"><CinematicFilmLink locale={locale}>{narrative.filmLink}</CinematicFilmLink></div>
      </Container>
    </section>

    <section data-header-section="light" id="venue" tabIndex={-1} className="editorial-section home-venue-section" aria-labelledby="home-venue-title">
      <AmbientArtwork variant="flow" figure="venue" />
      <Container>
        <Reveal className="home-venue-opening" stagger><SectionHeading chapter title={expectations.venueTitle} accents={locale === "ar" ? ["جديدة."] : ["perspectives."]} id="home-venue-title" /><div><h3>{expectations.venueName}</h3><p>{expectations.venueBody}</p><Link className="editorial-action" href={`/${locale}/dates-venue`}>{expectations.venueLink}<Arrow /></Link></div></Reveal>
        <Reveal className="home-venue-figure"><figure className="home-venue-photo"><Image src="/media/msrc-demo/king-faisal-venue.jpg" alt={expectations.venueAlt} fill sizes="(max-width: 800px) 94vw, 1200px" /><figcaption><Sparkle size={12} />{expectations.venueLocation}</figcaption></figure></Reveal>
      </Container>
    </section>

    <section data-header-section="light" id="faq" tabIndex={-1} className="editorial-section faq-section" aria-labelledby="practical-title">
      <Container><div className="faq-grid">
        <Reveal className="faq-introduction"><SectionHeading chapter title={narrative.practicalTitle} accents={locale === "ar" ? ["تصل."] : ["arrive."]} id="practical-title" /><div className="faq-utility-links"><Link className="editorial-action" href={`/${locale}/dates-venue`}>{narrative.datesLink}<Arrow /></Link><Link className="editorial-action" href={`/${locale}/contact`}>{demo.contact}<Arrow /></Link></div></Reveal>
        <div className="faq-list" aria-label={narrative.faqLabel}>{narrative.faq.map((faq) => <details className="faq-item" key={faq.question}>
          <summary><span>{faq.question}</span><span className="faq-icon-circle"><svg className="faq-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path className="faq-plus-vertical" d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></summary><p>{faq.answer}</p>
        </details>)}</div>
      </div></Container>
    </section>

    <ClosingCity video={demoImages.closing.video} poster={demoImages.closing.poster}>
      <Container><Reveal className="closing-grid" stagger><div><h2 id="closing-title">{copy.endingTitle}</h2><p className="closing-date"><Sparkle size={12} /><span>{dateRange}</span>{" "}<span aria-hidden="true">·</span>{" "}<span>{copy.city}</span></p></div><ReserveSeat locale={locale} label={demo.join} placement="above" /></Reveal></Container>
    </ClosingCity>
    </div>
  </div>;
}
