import { HeroMedia } from "@/components/hero-media";
import { CinematicFilm, CinematicFilmLink } from "@/components/cinematic-film";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionJourney } from "@/components/section-journey";
import { ScrollScenes } from "@/components/scroll-scenes";
import { ConferenceCountdown } from "@/components/conference-countdown";
import { Reveal } from "@/components/ui/reveal";
import { ResearchVisual } from "@/components/research-visual";
import { FlowLines } from "@/components/brand/flow-lines";
import { conferenceConfig } from "@/config/conference";
import { homepageAssets, homepageCopy } from "@/content/public-site";
import { homepageNarrative } from "@/content/homepage-narrative";
import { formatIndex, formatYear, type Locale } from "@/lib/i18n";
import type { PreviewHeroVideo } from "@/lib/media-policy";
import { formatConferenceDateRange } from "@/lib/conference-dates";

export type HomepageMediaPreview = { video: PreviewHeroVideo; poster: string; caption: string };
const Arrow = () => <svg className="directional-arrow" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function HomePageContent({ locale, media }: { locale: Locale; media?: HomepageMediaPreview }) {
  const copy = homepageCopy[locale];
  const narrative = homepageNarrative[locale];
  const dates = conferenceConfig.dates;
  const dateRange = dates ? formatConferenceDateRange(dates, locale) : copy.pending;
  return <div className="homepage-journey">
    <section id="top" tabIndex={-1} className="conference-hero" aria-labelledby="hero-title">
      <HeroMedia locale={locale} video={media?.video ?? homepageAssets.heroVideo} posterSrc={media?.poster ?? homepageAssets.heroPoster} allowPreview={Boolean(media)} playbackPolicy="respect-preferences" controlsMode="video">
        <Container className="hero-content">
          <div className="hero-layout">
            <div className="hero-editorial">
              <p className="hero-topline"><span>{copy.kicker}</span></p>
              <h1 id="hero-title"><span>{copy.title[0]}</span>{" "}<span>{copy.title[1]}</span></h1>
              <p className="hero-lead">{copy.lead}</p>
              <p className="hero-location"><span>{dateRange}</span><span aria-hidden="true">·</span><span>{copy.city}</span></p>
              <div className="hero-actions">
                <ButtonLink href={`/${locale}/program`} variant="gold">{narrative.programmeAction}<Arrow /></ButtonLink>
                <Link className="hero-secondary" href={`/${locale}/participate`}>{narrative.participationAction}<Arrow /></Link>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            {/* ORG-007: one centred cue that glides to the next section; reduced motion jumps. */}
            <Link href="#essentials" className="hero-scroll">{narrative.scroll}<span className="scroll-line" aria-hidden="true" /></Link>
            {media?.caption ? <span className="hero-caption">{media.caption}</span> : null}
          </div>
        </Container>
      </HeroMedia>
      <CinematicFilm locale={locale} />
    </section>
    <section id="essentials" tabIndex={-1} className="date-band" aria-labelledby="event-details-title">
      <Container className="date-band-inner">
        <div>
          <p className="eyebrow" id="event-details-title">{copy.editionLabel}</p>
          <dl id="event-details" tabIndex={-1} className="event-strip">
            <div><dt>{copy.dateLabel}</dt><dd>{dateRange}</dd></div>
            <div><dt>{copy.venueLabel}</dt><dd>{conferenceConfig.venue?.name[locale] ?? copy.pending}</dd></div>
          </dl>
        </div>
        {dates && <ConferenceCountdown dates={dates} locale={locale} dateRange={dateRange} />}
      </Container>
    </section>
    <SectionJourney locale={locale} />
    <ScrollScenes />
    <section id="about" tabIndex={-1} className="editorial-section intro-section" aria-labelledby="about-title">
      <Container><Reveal className="intro-grid" stagger>
        <div><SectionHeading chapter eyebrow={copy.aboutEyebrow} title={copy.aboutTitle} id="about-title" /></div>
        <div className="intro-body"><p className="intro-statement">{narrative.community}</p><p>{narrative.organizer}</p><div className="intro-visual"><FlowLines /><ResearchVisual className="intro-research-mark" /><span aria-hidden="true" className="visual-edition">{formatIndex(5, locale)}</span></div></div>
      </Reveal></Container>
    </section>
    <section id="participate" tabIndex={-1} className="editorial-section pathways-section" aria-labelledby="pathways-title">
      <Container>
        <Reveal className="section-introduction"><SectionHeading chapter eyebrow={copy.pathwaysEyebrow} title={copy.pathwaysTitle} id="pathways-title" /></Reveal>
        <Reveal className="pathway-list" stagger>{copy.pathways.map((pathway, index) => <article className="pathway-row" key={pathway.category}>
          <div className="pathway-card-top"><span className="pathway-number">{formatIndex(index + 1, locale)}</span><ResearchVisual variant={index} className="pathway-visual" /></div>
          <div className="pathway-title"><p>{pathway.category}</p><h3>{pathway.title}</h3></div>
          <p className="pathway-description">{pathway.description}</p>
          <div className="pathway-card-bottom"><StatusBadge tone="neutral">{copy.closed}</StatusBadge><Link href={`/${locale}${pathway.href}`} aria-label={`${narrative.pathwayLink}: ${pathway.category}`}><Arrow /></Link></div>
        </article>)}</Reveal>
        <Link className="pathways-extra" href={`/${locale}/participate#three-minute-thesis`}>{narrative.threeMinute}<Arrow /></Link>
      </Container>
    </section>
    <section id="program" tabIndex={-1} className="editorial-section program-section" aria-labelledby="program-title">
      <FlowLines className="program-flow" />
      <Container><Reveal className="program-grid" stagger>
        <div><SectionHeading chapter eyebrow={copy.programEyebrow} title={copy.programTitle} id="program-title" inverse /><ButtonLink className="program-link" href={`/${locale}/program`} variant="gold">{narrative.programmeLink}<Arrow /></ButtonLink></div>
        <div className="program-list"><p className="program-pending">{narrative.programmeStatus}</p>{copy.programRows.map((row, index) => <article className="program-row" key={row.format}>
          <div className="program-row-top"><span>{row.format}</span><span aria-hidden="true">{formatIndex(index + 1, locale)}</span></div><h3>{row.title}</h3><p>{row.description}</p>
        </article>)}<p className="program-note">{narrative.programmeNote}</p></div>
      </Reveal></Container>
    </section>
    <section id="speakers" tabIndex={-1} className="editorial-section speakers-section" aria-labelledby="speakers-title">
      <Container><Reveal className="speakers-editorial" stagger>
        <div className="speaker-identity-art" aria-hidden="true"><FlowLines /><span dir="ltr">MSRC<br/>2027</span><p>{narrative.portraitLabel}</p></div>
        <div><SectionHeading chapter eyebrow={narrative.speakersEyebrow} title={narrative.speakersTitle} id="speakers-title" /><p className="announcement-state"><span aria-hidden="true" />{narrative.speakersPending}</p><Link className="editorial-action" href={`/${locale}/speakers`}>{narrative.speakersLink}<Arrow /></Link></div>
      </Reveal></Container>
    </section>
    <section id="legacy" tabIndex={-1} className="editorial-section legacy-section" aria-labelledby="legacy-title">
      <Container><Reveal className="legacy-grid" stagger>
        <div className="legacy-copy"><SectionHeading chapter eyebrow={copy.legacyEyebrow} title={copy.legacyTitle} id="legacy-title" inverse /><p className="legacy-film-note">{narrative.legacyCaption}</p><div className="legacy-links"><CinematicFilmLink locale={locale}>{narrative.filmLink}<Arrow /></CinematicFilmLink></div></div>
        <div className="legacy-art" aria-hidden="true"><FlowLines /><div className="legacy-art-years" dir="ltr"><span>{formatYear(2026, locale)}</span><span>{formatYear(2027, locale)}</span></div><div className="legacy-art-caption"><span>MSRC</span><span>{copy.legacyArtLabel}</span></div></div>
      </Reveal></Container>
    </section>
    <section id="partners" tabIndex={-1} className="editorial-section partners-section" aria-labelledby="partners-title">
      <Container><Reveal className="partners-grid" stagger><SectionHeading chapter eyebrow={narrative.partnersEyebrow} title={narrative.partnersTitle} id="partners-title" /><p className="announcement-state"><span aria-hidden="true" />{narrative.partnersPending}</p></Reveal></Container>
    </section>
    <section id="faq" tabIndex={-1} className="editorial-section faq-section" aria-labelledby="practical-title">
      <Container><div className="faq-grid"><Reveal><SectionHeading chapter eyebrow={narrative.practicalEyebrow} title={narrative.practicalTitle} id="practical-title" /><Link className="date-band-link" href={`/${locale}/dates-venue`}>{narrative.datesLink}<Arrow /></Link></Reveal><div className="faq-list" aria-label={narrative.faqLabel}>{narrative.faq.map((faq) => <details className="faq-item" key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></div></Container>
    </section>
    <section className="closing-section" aria-labelledby="closing-title">
      <FlowLines />
      <Container><Reveal className="closing-grid" stagger><div><p className="closing-date">{dateRange} · {copy.city}</p><h2 id="closing-title">{copy.endingTitle}</h2></div><ButtonLink href={`/${locale}/participate`}>{narrative.endingAction}<Arrow /></ButtonLink></Reveal></Container>
    </section>
  </div>;
}
