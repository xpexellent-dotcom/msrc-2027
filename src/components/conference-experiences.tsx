"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useId, useSyncExternalStore, type ReactNode, type CSSProperties } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResearchVisual } from "@/components/research-visual";
import { FlowLines } from "@/components/brand/flow-lines";
import { HorizontalRail } from "@/components/horizontal-rail";
import { PortraitPlaceholder } from "@/components/portrait-placeholder";
import { ConferenceDayLinks } from "@/components/conference-day-links";
import { AmbientArtwork } from "@/components/ambient-artwork";
import { datesVenueCopy } from "@/content/dates-venue";
import { participationBenefitIcons, participationPathDescriptions } from "@/content/participation-copy";
import { BenefitArtwork } from "@/components/benefit-artwork";
import { JourneyArtwork, type JourneyArtworkMotif } from "@/components/journey-artwork";
import {
  experienceCopy, filterMedia, filterSessions, participationPaths, published,
  type ConferenceDay, type ExperiencePageId, type MediaEditionFilter, type PublicMedia, type PublicSession, type PublicSpeaker, type PublicWorkshop,
} from "@/content/conference-experiences";
import { conferenceConfig } from "@/config/conference";
import { formatIndex, formatMinutes, formatResultCount, type Locale } from "@/lib/i18n";

export type CatalogueQuery = { q?: string; day?: string; category?: string; room?: string; edition?: string; kind?: string };

// Keep native controls inert until the client commits hydration. An early change
// must not write history before the router can reflect it in useSearchParams.
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function queryDay(value?: string): "all" | ConferenceDay {
  return value === "day1" || value === "day2" ? value : "all";
}
function queryEdition(value?: string): MediaEditionFilter {
  return value === "2023" || value === "2024" || value === "2025" || value === "2026" || value === "2027" ? value : "all";
}
// Writes only the filters that changed, onto the current address. The rendered values lag the
// address until React re-renders, so writing them all let a second quick change put back a
// stale value (choosing an edition and then a kind dropped the edition).
function updateAddress(filters: Record<string, string | undefined>) {
  const address = new URL(window.location.href);
  for (const [key, value] of Object.entries(filters)) {
    if (value === "all" || !value) address.searchParams.delete(key);
    else address.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", address.href);
}

function Arrow() {
  return <svg className="directional-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

const experiencePhotos: Partial<Record<ExperiencePageId, string>> = {
  participate: "/media/participate/participate-header-v1.jpg",
  program: "programme-panel.jpg",
  registration: "attend-majed-9744.jpg",
  submissions: "share-research-manar-2560.jpg",
  workshops: "learn-doing-manar-2529.jpg",
  hackathon: "build-idea-majed-9846.jpg",
  threeMinuteThesis: "gallery-presentation.jpg",
  speakers: "speakers-rania-9801.jpg",
};

/** ORG-054: the date, edition and venue block appears only on the Participate hub and Attend. */
const showsEventFacts = (page: ExperiencePageId) => page === "participate" || page === "registration";

export function ExperienceIntro({ locale, page, announcement, children }: { locale: Locale; page: ExperiencePageId; announcement?: string; children?: ReactNode }) {
  const copy = experienceCopy[locale];
  const intro = copy.pages[page];
  const photo = experiencePhotos[page];
  const lines = intro.title.split("\n");
  return <section className={`experience-intro experience-intro--${page}${photo ? " premium-photo-hero fluid-journey-hero" : ""}`} data-publication-pending={announcement ? true : undefined} aria-labelledby="experience-title">
    {photo ? <div className="premium-hero-image" aria-hidden="true"><Image src={photo.startsWith("/") ? photo : `/media/msrc-demo/${photo}`} alt="" fill sizes="100vw" priority /></div> : null}
    <Container>
      <nav aria-label={copy.breadcrumb} className="experience-breadcrumb"><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li><span aria-hidden="true">/</span><span aria-current="page">{intro.label}</span></li></ol></nav>
      <div className="experience-intro-grid">
        <div><h1 id="experience-title">{lines.map((line, index) => <span key={line} className={index === lines.length - 1 ? "premium-title-accent" : undefined}>{index > 0 ? <><br />{" "}</> : null}{line}</span>)}</h1>{announcement ? <p className="experience-publication-status">{announcement}</p> : null}<p className="experience-lead">{intro.lead}</p>{children ? <div className="fluid-journey-hero-actions">{children}</div> : null}</div>
        <div className="experience-intro-art">{page === "program" ? <div className="program-date-panel" role="group" aria-label={datesVenueCopy[locale].datesHeading}><ConferenceDayLinks locale={locale} />{conferenceConfig.dates ? <a className="text-link program-calendar-link" href={`/${locale}/msrc-2027.ics`} download="msrc-2027.ics">{datesVenueCopy[locale].addToCalendar}</a> : null}</div> : showsEventFacts(page) ? <div className="experience-location"><span dir="ltr">MSRC / 2027</span><span>{copy.dates}</span><span>{copy.location}</span></div> : null}</div>
      </div>
    </Container>
  </section>;
}

function EmptyCatalogue({ title, body, testId, children }: { title: string; body: string; testId: string; children?: ReactNode }) {
  return <div className="experience-empty" data-testid={testId}>
    <div className="experience-empty-copy"><h2>{title}</h2><p>{body}</p>{children}</div>
  </div>;
}

function ExploreBand({ locale, title, href, label }: { locale: Locale; title: string; href: string; label: string }) {
  return <section className="experience-band"><Container><h2>{title}</h2><ButtonLink variant="gold" href={`/${locale}${href}`}>{label}<Arrow /></ButtonLink></Container></section>;
}

export function ProgrammeExperience({ locale, sessions: approvedSessions, speakers }: { locale: Locale; sessions: readonly PublicSession[]; speakers: readonly PublicSpeaker[]; initialQuery?: CatalogueQuery }) {
  const copy = experienceCopy[locale];
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const addressQuery = useSearchParams();
  const day = queryDay(addressQuery.get("day") ?? undefined);
  const category = addressQuery.get("category") ?? "all";
  const room = addressQuery.get("room") ?? "all";
  const query = addressQuery.get("q") ?? "";
  const confirmed = published(approvedSessions);
  const categories = [...new Map(confirmed.map((session) => [session.category.id, session.category])).values()];
  const rooms = [...new Set(confirmed.flatMap((session) => session.room ? [session.room] : []))];
  const sessions = filterSessions(approvedSessions, { day, category, room, query });
  const filtering = query.trim() !== "" || category !== "all" || room !== "all";
  const hasActiveFilters = filtering || day !== "all";

  function change(values: Partial<{ day: "all" | ConferenceDay; category: string; room: string; q: string }>) {
    if (!hydrated) return;
    updateAddress(values);
  }
  function clear() {
    document.getElementById("programme-search")?.focus();
    change({ day: "all", category: "all", room: "all", q: "" });
  }

  return <>
    <ExperienceIntro locale={locale} page="program" announcement={confirmed.length === 0 ? copy.programPending : undefined} />
    <section id="programme" tabIndex={-1} className="experience-catalogue" aria-label={copy.pages.program.label}>
      <Container>
        <div className="programme-toolbar"><div className="programme-days" role="group" aria-label={copy.conferenceDays}>
          {(["all", "day1", "day2"] as const).map((value) => <button type="button" data-testid={`program-day-${value}`} key={value} aria-pressed={day === value} disabled={!hydrated} onClick={() => change({ day: value })}>{value === "all" ? copy.allDays : copy[value === "day1" ? "day1Short" : "day2Short"]}</button>)}
        </div><p className="experience-timezone">{copy.timezone}</p></div>
        <div className="experience-filters">
          <label className="experience-search" htmlFor="programme-search">{copy.searchSessions}<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" /></svg><input id="programme-search" data-testid="program-search" type="search" value={query} disabled={!hydrated} onChange={(event) => change({ q: event.target.value })} placeholder={copy.searchSessionsPlaceholder} /></span></label>
          <label htmlFor="programme-category">{copy.category}<select id="programme-category" data-testid="program-category" value={category} onChange={(event) => change({ category: event.target.value })} disabled={!hydrated || categories.length === 0} aria-describedby={categories.length === 0 ? "programme-filter-note" : undefined}><option value="all">{copy.allFormats}</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.label[locale]}</option>)}</select></label>
          <label htmlFor="programme-room">{copy.room}<select id="programme-room" data-testid="program-room" value={room} onChange={(event) => change({ room: event.target.value })} disabled={!hydrated || rooms.length === 0} aria-describedby={rooms.length === 0 ? "programme-filter-note" : undefined}><option value="all">{copy.allRooms}</option>{rooms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        {categories.length === 0 || rooms.length === 0 ? <p id="programme-filter-note" className="experience-filter-note">{copy.filterNote}</p> : null}
        <div className={`experience-result-bar${!sessions.length && !hasActiveFilters ? " experience-result-bar--quiet" : ""}`}><p className={!sessions.length ? "sr-only" : undefined} role="status" aria-live="polite">{sessions.length ? formatResultCount(sessions.length, locale) : filtering ? copy.noResults : copy.programPending}</p>{hasActiveFilters ? <Button variant="ghost" size="small" data-testid="program-clear" disabled={!hydrated} onClick={clear}>{copy.clear}</Button> : null}</div>
        {sessions.length ? <div className="programme-results">{(["day1", "day2"] as const).map((value) => {
          const rows = sessions.filter((session) => session.day === value);
          return rows.length ? <section key={value} aria-labelledby={`programme-${value}-heading`}><h2 id={`programme-${value}-heading`} className="programme-day-heading">{copy[value]}</h2>{rows.map((session) => <SessionRow locale={locale} session={session} speakers={speakers} key={session.slug} />)}</section> : null;
        })}</div> : <EmptyCatalogue testId="program-empty" title={filtering ? copy.noResults : copy.programPending} body={filtering ? copy.noResultsBody : copy.programPendingBody} />}
      </Container>
    </section>
  </>;
}

function sessionClock(instant: string | null, locale: Locale) {
  if (!instant || Number.isNaN(Date.parse(instant))) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { timeZone: conferenceConfig.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(instant));
}
function sessionMinutes(session: PublicSession) {
  if (!session.startAt || !session.endAt) return null;
  const duration = (Date.parse(session.endAt) - Date.parse(session.startAt)) / 60_000;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

export function SessionRow({ locale, session, speakers: approvedSpeakers = [] }: { locale: Locale; session: PublicSession; speakers?: readonly PublicSpeaker[] }) {
  const copy = experienceCopy[locale];
  const start = sessionClock(session.startAt, locale);
  const end = sessionClock(session.endAt, locale);
  const duration = sessionMinutes(session);
  const speakers = published(approvedSpeakers).filter((speaker) => session.speakerSlugs.includes(speaker.slug));
  return <article className="conference-session-row">
    <div className="conference-session-time">{start ? <time dateTime={session.startAt!}>{start}{end ? ` – ${end}` : ""}</time> : <span>{copy.timePending}</span>}{duration ? <span>{formatMinutes(duration, locale)}</span> : null}</div>
    <div><p className="conference-session-format">{session.category.label[locale]}{session.room ? <span> · <bdi>{session.room}</bdi></span> : null}</p><h3 lang="en" dir="ltr"><Link href={`/${locale}/program/${session.slug}`}>{session.title}<Arrow /></Link></h3>{speakers.length ? <p className="conference-session-speakers" dir="ltr">{speakers.map((speaker) => speaker.name).join(" · ")}</p> : null}</div>
  </article>;
}

export function SpeakersExperience({ locale, speakers: approvedSpeakers }: { locale: Locale; speakers: readonly PublicSpeaker[] }) {
  const copy = experienceCopy[locale];
  const speakers = published(approvedSpeakers);
  return <><ExperienceIntro locale={locale} page="speakers" /><section className="experience-catalogue fluid-speakers-catalogue fluid-art-surface"><AmbientArtwork variant="people" /><Container>{speakers.length ? <div className="speaker-grid">{speakers.map((speaker) => <SpeakerCard locale={locale} speaker={speaker} key={speaker.slug} />)}</div> : <><EmptyCatalogue testId="speakers-empty" title={copy.speakersPending} body={copy.speakersPendingBody} /><SpeakerPreviewRail locale={locale} /></>}</Container></section></>;
}

/** Anonymous cards until the approved speaker roster is published. */
function SpeakerPreviewRail({ locale }: { locale: Locale }) {
  const copy = locale === "ar" ? {
    label: "المتحدثون في المؤتمر",
    name: "سيُعلن المتحدث لاحقًا",
    description: "ستُضاف السيرة والتخصص بعد الإعلان عن المتحدثين.",
  } : {
    label: "Conference speakers",
    name: "Speaker to be announced",
    description: "Biography and specialty will follow the speaker announcement.",
  };
  return <div className="speaker-page-preview" data-testid="speaker-pending-preview">
    <HorizontalRail locale={locale} label={copy.label}>
      {Array.from({ length: 4 }, (_, index) => <article className="speaker-preview-card" key={index}>
        <div className="speaker-preview-portrait"><PortraitPlaceholder variant={index} /></div>
        <div className="speaker-preview-content"><h3>{copy.name}</h3><p>{copy.description}</p></div>
      </article>)}
    </HorizontalRail>
  </div>;
}

export function SpeakerCard({ locale, speaker }: { locale: Locale; speaker: PublicSpeaker }) {
  return <article className="conference-speaker-card"><Link className="conference-speaker-card-link" href={`/${locale}/speakers/${speaker.slug}`} aria-label={speaker.name}><div className="conference-speaker-portrait">{speaker.portrait ? <Image src={speaker.portrait} alt={speaker.portraitAlt[locale]} fill sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 28vw" /> : <ResearchVisual variant={0} />}<FlowLines className="speaker-flow-lines" /></div><div className="conference-speaker-copy" dir="ltr"><h2>{speaker.name}</h2><p>{speaker.title}</p><p>{speaker.institution}</p></div></Link></article>;
}

export function MediaExperience({ locale, media, sessions }: { locale: Locale; media: readonly PublicMedia[]; sessions: readonly PublicSession[]; initialQuery?: CatalogueQuery }) {
  const copy = experienceCopy[locale];
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const addressQuery = useSearchParams();
  const query = addressQuery.get("q") ?? "";
  const edition = queryEdition(addressQuery.get("edition") ?? undefined);
  const kind = addressQuery.get("kind") ?? "all";
  const records = filterMedia(media, { query, edition, kind });
  const editions = [...new Set(records.map((record) => record.edition))];
  const filtering = query.trim() !== "" || kind !== "all";
  const hasActiveFilters = filtering || edition !== "all";
  function change(values: Partial<{ q: string; edition: MediaEditionFilter; kind: string }>) {
    if (!hydrated) return;
    updateAddress(values);
  }
  function clear() {
    document.getElementById("media-search")?.focus();
    change({ q: "", edition: "all", kind: "all" });
  }
  const editionText = edition === "all" ? copy.mediaPendingBody : copy.selectedMediaPending.replace("{edition}", new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { numberingSystem: locale === "ar" ? "arab" : "latn", useGrouping: false }).format(Number(edition)));
  return <><ExperienceIntro locale={locale} page="media" /><section className="experience-catalogue" data-testid="media-catalogue"><Container>
    <div className="experience-filters">
      <label className="experience-search" htmlFor="media-search">{copy.searchMedia}<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" /></svg><input id="media-search" data-testid="media-search" type="search" value={query} disabled={!hydrated} placeholder={copy.searchMediaPlaceholder} onChange={(event) => change({ q: event.target.value })} /></span></label>
      <label htmlFor="media-edition">{copy.edition}<select id="media-edition" data-testid="media-edition" value={edition} disabled={!hydrated} onChange={(event) => change({ edition: queryEdition(event.target.value) })}><option value="all">{copy.allEditions}</option>{[2026, 2025, 2024, 2023, 2027].map((year) => <option value={year} key={year}>MSRC {year}</option>)}</select></label>
      <label htmlFor="media-kind">{copy.mediaKind}<select id="media-kind" data-testid="media-kind" value={kind} disabled={!hydrated} onChange={(event) => change({ kind: event.target.value })}><option value="all">{copy.allMedia}</option><option value="recording">{copy.recordings}</option><option value="highlight">{copy.highlights}</option><option value="photograph">{copy.photographs}</option></select></label>
    </div>
    <div className={`experience-result-bar${!records.length && !hasActiveFilters ? " experience-result-bar--quiet" : ""}`}><p className={!records.length ? "sr-only" : undefined} role="status" aria-live="polite">{records.length ? formatResultCount(records.length, locale) : filtering ? copy.noResults : copy.mediaPending}</p>{hasActiveFilters ? <Button variant="ghost" size="small" data-testid="media-clear" disabled={!hydrated} onClick={clear}>{copy.clear}</Button> : null}</div>
    {records.length ? <div className="conference-media-albums">{editions.map((year) => <section className="conference-media-edition" data-edition={year} aria-labelledby={`media-edition-${year}`} key={year}>
      <h2 id={`media-edition-${year}`} dir="ltr">MSRC {year}</h2>
      <div className="conference-media-grid">{records.filter((record) => record.edition === year).map((record) => <MediaCard locale={locale} record={record} session={published(sessions).find((session) => session.slug === record.sessionSlug)} key={record.slug} />)}</div>
    </section>)}</div> : <EmptyCatalogue testId="media-empty" title={filtering ? copy.noResults : copy.mediaPending} body={filtering ? copy.noResultsBody : editionText} />}
    <p className="experience-access-note" data-testid="media-access-note">{copy.accessNote}</p>
  </Container></section><ExploreBand locale={locale} title={copy.previousTitle} href="/#film" label={copy.previousLink} /></>;
}

export function MediaCard({ locale, record, session }: { locale: Locale; record: PublicMedia; session?: PublicSession }) {
  const copy = experienceCopy[locale];
  const isPhoto = record.kind === "photograph" && record.access === "public";
  const title = locale === "ar" && record.titleAr ? record.titleAr : record.title;
  const description = locale === "ar" && record.descriptionAr ? record.descriptionAr : record.description;
  const captionLocale = locale === "ar" && record.titleAr ? "ar" : "en";
  const duration = record.durationSeconds ? record.durationSeconds < 60
    ? new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { style: "unit", unit: "second", unitDisplay: "long", maximumFractionDigits: 0 }).format(Math.max(1, Math.round(record.durationSeconds)))
    : formatMinutes(Math.ceil(record.durationSeconds / 60), locale) : null;
  return <article className="conference-media-card" data-media-kind={record.kind}>
    <div className={`conference-media-player${isPhoto ? " conference-media-player--photo" : ""}`}>
      {record.access === "public" ? record.kind === "photograph" ? <>
        <Image src={record.asset} alt={description} fill style={{ objectPosition: record.objectPosition ?? "50% 50%" }} sizes="(max-width: 600px) 90vw, 45vw" />
        <span className="conference-media-year" dir="ltr">{record.edition}</span>
      </> : <video controls playsInline preload="none" poster={record.poster ?? undefined} src={record.asset} aria-label={title}>{record.captions?.map((caption, index) => <track key={caption.src} kind="captions" src={caption.src} srcLang={caption.language} label={caption.label} default={index === 0} />)}</video> : <div className="conference-media-unavailable"><ResearchVisual variant={2} /><p>{record.access === "restricted" ? copy.recordingRestricted : copy.recordingPending}</p></div>}
    </div>
    <div className="conference-media-copy">
      <h3 lang={captionLocale} dir={captionLocale === "ar" ? "rtl" : "ltr"}>{title}</h3>
      {!isPhoto ? <p><bdi>MSRC {record.edition}</bdi>{duration ? ` · ${duration}` : ""}</p> : null}
      {record.speakerNames.length ? <p dir="ltr">{record.speakerNames.join(" · ")}</p> : null}
      {record.topic ? <p lang="en" dir="ltr">{record.topic}</p> : null}
      {session && session.publication === "approved" && session.slug === record.sessionSlug && record.edition === 2027 ? <Link href={`/${locale}/program/${session.slug}`}>{copy.sessionDetails}<Arrow /></Link> : null}
    </div>
  </article>;
}

export function ParticipateExperience({ locale }: { locale: Locale }) {
  const copy = experienceCopy[locale];
  return <><ExperienceIntro locale={locale} page="participate" /><section className="participation-hub" aria-label={copy.pages.participate.label}><Container><div className="participation-paths">{participationPaths.map((path) => <article className="participation-path" key={path.id} id={path.id === "threeMinuteThesis" ? "three-minute-thesis" : path.id} tabIndex={-1}>
    <Link className="participation-path-link" href={`/${locale}${path.href}`}>
      <span className="participation-path-icon" aria-hidden="true">{path.icon ? <Image src={path.icon} alt="" width={56} height={56} /> : <JourneyIcon variant={path.glyph} />}</span>
      <div className="participation-path-copy"><h2>{copy.pages[path.id].label}</h2><p>{participationPathDescriptions[locale][path.id]}</p></div><Arrow />
    </Link>
  </article>)}</div></Container></section></>;
}

export function JourneyExperience({ locale, journey, workshops: approvedWorkshops = [] }: { locale: Locale; journey: keyof typeof experienceCopy.en.journeys; workshops?: readonly PublicWorkshop[] }) {
  const copy = experienceCopy[locale];
  const content = copy.journeys[journey];
  const workshops = published(approvedWorkshops);
  const actions = journeyActionCopy[locale];
  return <div className={`participation-journey participation-journey--${journey}`}><ExperienceIntro locale={locale} page={journey}>
      {journey !== "registration" ? <ButtonLink variant="gold" href={journey === "workshops" ? "#workshop-catalogue" : "#journey-availability"} aria-describedby="journey-closed-title">{actions.primary[journey]}<Arrow /></ButtonLink> : null}
      <div className="participation-program"><Button disabled data-testid="brochure-unavailable" aria-describedby="brochure-unavailable-note" variant="ghost" size="small">{actions.brochure}</Button><p id="brochure-unavailable-note">{actions.brochurePending}</p></div>
    </ExperienceIntro>
    <section id="journey-availability" tabIndex={-1} className="journey-availability fluid-journey-availability" data-testid="journey-closed" aria-labelledby="journey-closed-title"><Container><div className="journey-availability-dot" aria-hidden="true" /><div><h2 id="journey-closed-title">{content.closed}</h2><p>{content.closedBody}</p></div></Container></section>
    {content.tracks ? <section id="journey-tracks" className="participation-tracks participation-ambient" aria-labelledby="journey-tracks-title"><SideArtwork motif={journey} area="tracks" /><Container><ArtworkHeading motif={journey} area="tracks"><p className="participation-section-label">{content.tracks.label}</p><h2 id="journey-tracks-title">{content.tracks.title}</h2></ArtworkHeading><div className="participation-track-list">{content.tracks.items.map((track) => <article className="participation-track" key={track.label}><p className="participation-track-label">{track.label}</p><h3 lang="en" dir="ltr">{track.title}</h3><p>{track.body}</p></article>)}</div><p className="participation-track-note">{content.tracks.note}</p></Container></section> : null}
    <section id="journey-benefits" className="participation-benefits participation-ambient" aria-labelledby="journey-benefits-title"><div className="journey-art-slot journey-art-slot--mobile" aria-hidden="true"><JourneyArtwork motif={journey} variant={2} /></div><SideArtwork motif={journey} area="benefits" /><Container><ArtworkHeading motif={journey} area="benefits"><p className="participation-section-label">{journey === "workshops" ? actions.learning : actions.benefits}</p><h2 id="journey-benefits-title">{content.detailsTitle}</h2></ArtworkHeading><div className="participation-benefit-list">{content.details.map((detail, index) => <article className="participation-benefit" key={detail.title}><BenefitArtwork icon={participationBenefitIcons[journey][index] ?? "research"} locale={locale} /><div><h3>{detail.title}</h3><p>{detail.body}</p></div></article>)}</div>
      {content.goodToKnow ? <aside className="participation-good-to-know" aria-labelledby="good-to-know-title"><h3 id="good-to-know-title">{content.goodToKnow.title}</h3><ul>{content.goodToKnow.points.map((point) => <li key={point}>{point}</li>)}</ul></aside> : null}
    </Container></section>
    {content.schedule ? <section id="journey-schedule" className="participation-schedule" aria-labelledby="journey-schedule-title"><Container><h2 id="journey-schedule-title">{content.schedule.title}</h2><ol className="participation-schedule-list">{content.schedule.items.map((item) => <li key={item.label}><span className="participation-schedule-day">{item.label}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol></Container></section> : null}
    {journey === "workshops" ? <WorkshopRail locale={locale} workshops={workshops} /> : null}
    <section id="journey-steps" className="participation-steps participation-ambient" aria-labelledby="journey-steps-title"><SideArtwork motif={journey} area="steps" /><Container><ArtworkHeading motif={journey} area="steps"><h2 id="journey-steps-title">{content.stepsTitle}</h2></ArtworkHeading><ol>{content.steps.map((step, index) => <li key={step}><span aria-hidden="true">{formatIndex(index + 1, locale)}</span><p>{step}</p></li>)}</ol>
      {journey === "registration" ? <div className="participation-bottom-action"><ButtonLink variant="gold" href={`/${locale}/sign-up`} data-testid="participation-sign-up">{actions.primary.registration}<Arrow /></ButtonLink></div> : null}
    </Container></section>
    <section className="fluid-journey-resources participation-ambient" aria-labelledby="journey-resources-title"><SideArtwork motif={journey} area="resources" /><Container><ArtworkHeading motif={journey} area="resources"><h2 id="journey-resources-title">{actions.resources}</h2></ArtworkHeading><div className="fluid-resource-grid">
      <div className="fluid-resource fluid-resource--pending"><JourneyIcon variant={3} /><Button disabled data-testid="ticket-unavailable" aria-describedby="ticket-unavailable-note" variant="secondary">{actions.ticket}</Button><p id="ticket-unavailable-note">{actions.ticketPending}</p></div>
      <Link className="fluid-resource" href={`/${locale}/participate`}><JourneyIcon variant={0} /><span>{copy.otherPaths}</span><Arrow /></Link>
      <Link className="fluid-resource" href={`/${locale}#faq`}><JourneyIcon variant={4} /><span>{actions.faq}</span><Arrow /></Link>
    </div></Container></section>
  </div>;
}

const journeyActionCopy = {
  en: {
    primary: { registration: "Sign up for MSRC", submissions: "Submit your abstract", workshops: "Explore workshops", hackathon: "Enter the hackathon", threeMinuteThesis: "Enter 3MT" },
    benefits: "What you gain", learning: "Practical learning",
    resources: "Your next move.", ticket: "View my ticket", ticketPending: "Tickets will be available after registration opens and your place is confirmed by email.",
    guidelines: "View submission guidelines", requirements: "Review participation requirements", faq: "Frequently asked questions", brochure: "Download the program", brochurePending: "The program brochure will be available once published.",
  },
  ar: {
    primary: { registration: "سجّل في MSRC", submissions: "قدّم ملخصك البحثي", workshops: "استكشف ورش العمل", hackathon: "شارك في الهاكاثون", threeMinuteThesis: "شارك في 3MT" },
    benefits: "ما الذي تكتسبه", learning: "تعلّم عملي",
    resources: "خطوتك التالية.", ticket: "عرض تذكرتي", ticketPending: "ستتاح التذاكر بعد فتح التسجيل وتأكيد مقعدك عبر البريد الإلكتروني.",
    guidelines: "عرض إرشادات التقديم", requirements: "مراجعة متطلبات المشاركة", faq: "الأسئلة الشائعة", brochure: "تنزيل البرنامج", brochurePending: "سيتاح كتيّب البرنامج بعد نشره.",
  },
} as const;

/** Geometric symbols share the card material without implying announced services. */
function JourneyIcon({ variant }: { variant: number }) {
  const gradientId = useId();
  const symbols = [
    <g key="community"><circle cx="24" cy="17" r="6" /><path d="M12 37v-3a12 12 0 0 1 24 0v3M10 12a5 5 0 0 0 0 10M38 12a5 5 0 0 1 0 10M5 33v-2a9 9 0 0 1 5-8M43 33v-2a9 9 0 0 0-5-8" /></g>,
    <g key="document"><path d="M14 6h15l8 8v27H11V6h3M29 6v9h8M18 23h12M18 30h12" /></g>,
    <g key="check"><rect x="7" y="11" width="34" height="26" rx="5" /><path d="m8 14 16 12 16-12m-22 9 6 6 12-12" /></g>,
    <g key="ticket"><path d="M6 14h36v8a5 5 0 0 0 0 10v7H6v-7a5 5 0 0 0 0-10v-8Z" /><path d="M30 14v5m0 5v5m0 5v5" /></g>,
    <g key="conversation"><path d="M39 26a14 14 0 0 1-14 14H9l4-7A14 14 0 1 1 39 26Z" /><path d="M20 17a5 5 0 0 1 10 0c0 4-5 4-5 8m0 5h.01" /></g>,
    <g key="calendar"><rect x="7" y="10" width="34" height="31" rx="5" /><path d="M15 6v9M33 6v9M7 21h34M16 28h4m8 0h4m-16 7h4m8 0h4" /></g>,
    <g key="idea"><path d="M24 6a12 12 0 0 0-7.2 21.6c1.3 1 2.2 2.6 2.2 4.3V34h10v-2.1c0-1.7.9-3.3 2.2-4.3A12 12 0 0 0 24 6Z" /><path d="M19 39h10M21 43h6M24 14v6m-4-2 4 4 4-4" /></g>,
    <g key="stopwatch"><circle cx="24" cy="27" r="14" /><path d="M24 27v-7M20 6h8M24 6v7M35 15l3-3" /></g>,
  ];
  return <span className="fluid-journey-icon" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id={gradientId} x1="7" y1="7" x2="41" y2="41" gradientUnits="userSpaceOnUse"><stop stopColor="#9b76c5" /><stop offset=".55" stopColor="#512f7b" /><stop offset="1" stopColor="#9b7529" /></linearGradient></defs>{symbols[variant % symbols.length]}</svg></span>;
}

type ArtworkArea = "tracks" | "benefits" | "rail" | "steps" | "resources";
const journeyOrder = ["registration", "submissions", "workshops", "hackathon", "threeMinuteThesis"] as const;
const areaSeeds: Record<ArtworkArea, number> = { tracks: 3, benefits: 0, rail: 4, steps: 7, resources: 9 };

/** The second grid cell is genuinely empty space, even when Arabic headings wrap. */
function ArtworkHeading({ motif, area, children }: { motif: JourneyArtworkMotif; area: ArtworkArea; children: ReactNode }) {
  return <div className={`participation-heading participation-heading--${area}`}>
    <div className="participation-heading-copy">{children}</div>
    <div className="journey-art-slot journey-art-slot--heading" aria-hidden="true"><JourneyArtwork motif={motif} variant={areaSeeds[area] + journeyOrder.indexOf(motif)} /></div>
  </div>;
}

type SideArt = { side: "start" | "end"; size: "lg" | "md" | "sm"; edge: "top" | "bottom"; at: string; turn: string; variant: number };
// Each clipped gutter has its own composition, rather than repeated corner stamps.
const sideArtwork: Record<ArtworkArea, readonly SideArt[]> = {
  tracks: [{ side: "start", size: "sm", edge: "top", at: "12%", turn: "-18deg", variant: 3 }, { side: "end", size: "md", edge: "bottom", at: "0%", turn: "12deg", variant: 6 }],
  benefits: [{ side: "start", size: "lg", edge: "top", at: "18%", turn: "-12deg", variant: 2 }, { side: "end", size: "md", edge: "bottom", at: "5%", turn: "22deg", variant: 5 }],
  rail: [{ side: "start", size: "md", edge: "bottom", at: "6%", turn: "14deg", variant: 8 }, { side: "end", size: "lg", edge: "top", at: "9%", turn: "-8deg", variant: 3 }],
  steps: [{ side: "start", size: "sm", edge: "bottom", at: "3%", turn: "24deg", variant: 7 }, { side: "end", size: "md", edge: "top", at: "8%", turn: "-24deg", variant: 4 }],
  resources: [{ side: "start", size: "md", edge: "top", at: "5%", turn: "-8deg", variant: 9 }, { side: "end", size: "sm", edge: "bottom", at: "4%", turn: "18deg", variant: 2 }],
};
// One large, very faint study per section sits behind the whole section like a
// watermark, alternating sides down the page so the background reads as one theme.
const backdropSides: Record<ArtworkArea, "start" | "end"> = { tracks: "start", benefits: "end", rail: "start", steps: "end", resources: "start" };
function SideArtwork({ motif, area }: { motif: JourneyArtworkMotif; area: ArtworkArea }) {
  const shift = journeyOrder.indexOf(motif);
  return <><div aria-hidden="true" className={`journey-art-backdrop journey-art-backdrop--${backdropSides[area]} journey-art-backdrop--${area}`}>
    <JourneyArtwork motif={motif} variant={areaSeeds[area] + 11 + shift} />
  </div>{sideArtwork[area].map((piece) => <div key={piece.side} aria-hidden="true"
    className={`journey-art-slot journey-art-slot--margin journey-art-slot--${piece.side} journey-art-slot--${piece.size} journey-art-slot--${piece.edge}`}
    style={{ "--art-at": piece.at, "--art-turn": piece.turn } as CSSProperties}>
    <JourneyArtwork motif={motif} variant={piece.variant + shift} />
  </div>)}</>;
}

function WorkshopRail({ locale, workshops }: { locale: Locale; workshops: readonly PublicWorkshop[] }) {
  const copy = experienceCopy[locale];
  const heading = locale === "ar" ? "اختر مساحةً للتعلّم." : "Find your next skill.";
  return <section id="workshop-catalogue" tabIndex={-1} className="fluid-workshop-section fluid-art-surface participation-ambient" aria-labelledby="workshop-catalogue-title"><SideArtwork motif="workshops" area="rail" /><Container>
    <ArtworkHeading motif="workshops" area="rail"><h2 id="workshop-catalogue-title">{heading}</h2></ArtworkHeading>
    {!workshops.length ? <div data-testid="workshops-empty" className="fluid-workshop-pending"><h3>{copy.workshopsPending}</h3><p>{copy.workshopsPendingBody}</p></div> : null}
    <HorizontalRail locale={locale} label={copy.pages.workshops.label} className="fluid-workshop-rail">
      {workshops.length ? workshops.map((workshop) => <article className="fluid-workshop-card" key={workshop.slug}><WorkshopImagePlaceholder /><div className="fluid-workshop-copy"><h3>{workshop.title[locale]}</h3><p>{workshop.description[locale]}</p><p>{sessionClock(workshop.startAt, locale) ?? copy.timePending}{workshop.room ? ` · ${workshop.room}` : ""}</p>{workshop.eligibility ? <p>{workshop.eligibility[locale]}</p> : null}<StatusBadge tone="neutral">{copy.closedLabel}</StatusBadge></div></article>) : Array.from({ length: 3 }, (_, index) => <article className="fluid-workshop-card" key={index}><WorkshopImagePlaceholder /><div className="fluid-workshop-copy"><h3>{locale === "ar" ? "سيُعلن عن الورشة لاحقًا" : "Workshop to be announced"}</h3><p>{locale === "ar" ? "سيُضاف الموضوع والمدرب والوقت بعد إعلان دليل الورش." : "Topic, instructor and time will follow the catalogue announcement."}</p><StatusBadge tone="neutral">{copy.closedLabel}</StatusBadge></div></article>)}
    </HorizontalRail>
  </Container></section>;
}

function WorkshopImagePlaceholder() {
  return <div className="fluid-workshop-image" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="8" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" /><circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="m8 34 10-9 8 7 7-7 7 9" stroke="currentColor" strokeWidth="1.5" /></svg></div>;
}

export function SessionDetailExperience({ locale, session, speakers: approvedSpeakers = [], recording }: { locale: Locale; session: PublicSession; speakers?: readonly PublicSpeaker[]; recording?: PublicMedia }) {
  const copy = experienceCopy[locale];
  const speakers = published(approvedSpeakers).filter((speaker) => session.speakerSlugs.includes(speaker.slug));
  const start = sessionClock(session.startAt, locale); const end = sessionClock(session.endAt, locale); const duration = sessionMinutes(session);
  return <><section className="experience-detail-intro"><Container><Link href={`/${locale}/program`}>{copy.pages.program.label}</Link><p className="eyebrow">{session.category.label[locale]} · {copy[session.day]}</p><h1 lang="en" dir="ltr">{session.title}</h1><dl className="session-detail-facts"><div><dt>{copy.time}</dt><dd>{start ? `${start}${end ? ` – ${end}` : ""}` : copy.timePending}</dd></div>{duration ? <div><dt>{copy.duration}</dt><dd>{formatMinutes(duration, locale)}</dd></div> : null}{session.room ? <div><dt>{copy.room}</dt><dd><bdi>{session.room}</bdi></dd></div> : null}</dl><p className="experience-timezone">{copy.timezone}</p></Container></section><section className="experience-detail-body"><Container narrow><p lang="en" dir="ltr">{session.description}</p>{session.objectives.length ? <div><h2>{copy.objectives}</h2><ul lang="en" dir="ltr">{session.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></div> : null}{speakers.length ? <div><h2>{copy.pages.speakers.label}</h2><div className="speaker-grid">{speakers.map((speaker) => <SpeakerCard locale={locale} speaker={speaker} key={speaker.slug} />)}</div></div> : null}<div><h2>{copy.recording}</h2>{recording ? <MediaCard locale={locale} record={recording} session={session} /> : <p>{copy.recordingPending}</p>}</div></Container></section></>;
}

export function SpeakerDetailExperience({ locale, speaker, sessions: approvedSessions = [] }: { locale: Locale; speaker: PublicSpeaker; sessions?: readonly PublicSession[] }) {
  const copy = experienceCopy[locale];
  const sessions = published(approvedSessions).filter((session) => session.speakerSlugs.includes(speaker.slug));
  return <><section className="experience-detail-intro"><Container><Link href={`/${locale}/speakers`}>{copy.pages.speakers.label}</Link><div className="speaker-profile-heading"><div><p className="eyebrow">MSRC / 2027</p><h1 dir="ltr">{speaker.name}</h1><p dir="ltr">{speaker.title}</p><p dir="ltr">{speaker.institution}</p></div><div className="conference-speaker-portrait">{speaker.portrait ? <Image src={speaker.portrait} alt={speaker.portraitAlt[locale]} fill sizes="(max-width: 600px) 90vw, 35vw" priority /> : <ResearchVisual variant={0} />}</div></div></Container></section><section className="experience-detail-body"><Container narrow><h2>{copy.biography}</h2><p lang="en" dir="ltr">{speaker.biography}</p>{speaker.professionalLinks.length ? <ul className="speaker-professional-links">{speaker.professionalLinks.map((link) => <li key={link.href}><Link href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<Arrow /></Link></li>)}</ul> : null}<div><h2>{copy.speakerSessions}</h2>{sessions.length ? sessions.map((session) => <SessionRow key={session.slug} locale={locale} session={session} speakers={[speaker]} />) : <p>{copy.programPending}</p>}</div></Container></section></>;
}
