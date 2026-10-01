"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResearchVisual } from "@/components/research-visual";
import { FlowLines } from "@/components/brand/flow-lines";
import {
  experienceCopy, filterMedia, filterSessions, participationPaths, published,
  type ConferenceDay, type ExperiencePageId, type PublicMedia, type PublicSession, type PublicSpeaker, type PublicWorkshop,
} from "@/content/conference-experiences";
import { conferenceConfig } from "@/config/conference";
import { formatIndex, formatMinutes, formatResultCount, type Locale } from "@/lib/i18n";

export type CatalogueQuery = { q?: string; day?: string; category?: string; room?: string; edition?: string; kind?: string };

function queryDay(value?: string): "all" | ConferenceDay {
  return value === "day1" || value === "day2" ? value : "all";
}
function queryEdition(value?: string): "all" | "2026" | "2027" {
  return value === "2026" || value === "2027" ? value : "all";
}
function updateAddress(filters: Record<string, string>) {
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

export function ExperienceIntro({ locale, page, children }: { locale: Locale; page: ExperiencePageId; children?: ReactNode }) {
  const copy = experienceCopy[locale];
  const intro = copy.pages[page];
  return <section className={`experience-intro experience-intro--${page}`} aria-labelledby="experience-title">
    <Container>
      <nav aria-label={copy.breadcrumb} className="experience-breadcrumb"><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li><span aria-hidden="true">/</span><span aria-current="page">{intro.label}</span></li></ol></nav>
      <div className="experience-intro-grid">
        <div><h1 id="experience-title">{intro.title}</h1><p className="experience-lead">{intro.lead}</p></div>
        <div className="experience-intro-art"><FlowLines className="experience-flow-lines" /><ResearchVisual variant={page === "hackathon" ? 1 : page === "media" ? 2 : 0} /><div className="experience-location"><span dir="ltr">MSRC / 2027</span><span>{copy.dates}</span><span>{copy.location}</span></div></div>
      </div>
      {children}
    </Container>
  </section>;
}

function EmptyCatalogue({ title, body, testId, children }: { title: string; body: string; testId: string; children?: ReactNode }) {
  return <div className="experience-empty" data-testid={testId}>
    <div className="experience-empty-mark" aria-hidden="true"><span /><span /><span /></div>
    <div><h2>{title}</h2><p>{body}</p>{children}</div>
  </div>;
}

function ExploreBand({ locale, title, href, label }: { locale: Locale; title: string; href: string; label: string }) {
  return <section className="experience-band"><Container><h2>{title}</h2><ButtonLink variant="gold" href={`/${locale}${href}`}>{label}<Arrow /></ButtonLink></Container></section>;
}

export function ProgrammeExperience({ locale, sessions: approvedSessions, speakers }: { locale: Locale; sessions: readonly PublicSession[]; speakers: readonly PublicSpeaker[]; initialQuery?: CatalogueQuery }) {
  const copy = experienceCopy[locale];
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
    const next = { day, category, room, q: query, ...values };
    updateAddress(next);
  }
  function clear() {
    document.getElementById("programme-search")?.focus();
    change({ day: "all", category: "all", room: "all", q: "" });
  }

  return <>
    <ExperienceIntro locale={locale} page="program" />
    <section className="experience-catalogue" aria-label={copy.pages.program.label}>
      <Container>
        <div className="programme-toolbar"><div className="programme-days" role="group" aria-label={copy.conferenceDays}>
          {(["all", "day1", "day2"] as const).map((value) => <button type="button" data-testid={`program-day-${value}`} key={value} aria-pressed={day === value} onClick={() => change({ day: value })}>{value === "all" ? copy.allDays : copy[value]}</button>)}
        </div><p className="experience-timezone">{copy.timezone}</p></div>
        <div className="experience-filters">
          <label className="experience-search" htmlFor="programme-search">{copy.searchSessions}<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" /></svg><input id="programme-search" data-testid="program-search" type="search" value={query} onChange={(event) => change({ q: event.target.value })} placeholder={copy.searchSessionsPlaceholder} /></span></label>
          <label htmlFor="programme-category">{copy.category}<select id="programme-category" data-testid="program-category" value={category} onChange={(event) => change({ category: event.target.value })} disabled={categories.length === 0} aria-describedby={categories.length === 0 ? "programme-filter-note" : undefined}><option value="all">{copy.allFormats}</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.label[locale]}</option>)}</select></label>
          <label htmlFor="programme-room">{copy.room}<select id="programme-room" data-testid="program-room" value={room} onChange={(event) => change({ room: event.target.value })} disabled={rooms.length === 0} aria-describedby={rooms.length === 0 ? "programme-filter-note" : undefined}><option value="all">{copy.allRooms}</option>{rooms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        {categories.length === 0 || rooms.length === 0 ? <p id="programme-filter-note" className="experience-filter-note">{copy.filterNote}</p> : null}
        <div className={`experience-result-bar${!sessions.length && !hasActiveFilters ? " experience-result-bar--quiet" : ""}`}><p className={!sessions.length ? "sr-only" : undefined} role="status" aria-live="polite">{sessions.length ? formatResultCount(sessions.length, locale) : filtering ? copy.noResults : copy.programPending}</p>{hasActiveFilters ? <Button variant="ghost" size="small" data-testid="program-clear" onClick={clear}>{copy.clear}</Button> : null}</div>
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
  return <><ExperienceIntro locale={locale} page="speakers" /><section className="experience-catalogue"><Container>{speakers.length ? <div className="speaker-grid">{speakers.map((speaker) => <SpeakerCard locale={locale} speaker={speaker} key={speaker.slug} />)}</div> : <EmptyCatalogue testId="speakers-empty" title={copy.speakersPending} body={copy.speakersPendingBody} />}</Container></section></>;
}

export function SpeakerCard({ locale, speaker }: { locale: Locale; speaker: PublicSpeaker }) {
  return <article className="conference-speaker-card"><Link className="conference-speaker-card-link" href={`/${locale}/speakers/${speaker.slug}`} aria-label={speaker.name}><div className="conference-speaker-portrait">{speaker.portrait ? <Image src={speaker.portrait} alt={speaker.portraitAlt[locale]} fill sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 28vw" /> : <ResearchVisual variant={0} />}<FlowLines className="speaker-flow-lines" /></div><div className="conference-speaker-copy" dir="ltr"><h2>{speaker.name}</h2><p>{speaker.title}</p><p>{speaker.institution}</p></div></Link></article>;
}

export function MediaExperience({ locale, media, sessions }: { locale: Locale; media: readonly PublicMedia[]; sessions: readonly PublicSession[]; initialQuery?: CatalogueQuery }) {
  const copy = experienceCopy[locale];
  const addressQuery = useSearchParams();
  const query = addressQuery.get("q") ?? "";
  const edition = queryEdition(addressQuery.get("edition") ?? undefined);
  const kind = addressQuery.get("kind") ?? "all";
  const records = filterMedia(media, { query, edition, kind });
  const filtering = query.trim() !== "" || kind !== "all";
  const hasActiveFilters = filtering || edition !== "all";
  function change(values: Partial<{ q: string; edition: "all" | "2026" | "2027"; kind: string }>) {
    const next = { q: query, edition, kind, ...values }; updateAddress(next);
  }
  function clear() {
    document.getElementById("media-search")?.focus();
    change({ q: "", edition: "all", kind: "all" });
  }
  const editionText = edition === "all" ? copy.mediaPendingBody : copy.selectedMediaPending.replace("{edition}", new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { numberingSystem: locale === "ar" ? "arab" : "latn", useGrouping: false }).format(Number(edition)));
  return <><ExperienceIntro locale={locale} page="media" /><section className="experience-catalogue" data-testid="media-catalogue"><Container>
    <div className="experience-filters">
      <label className="experience-search" htmlFor="media-search">{copy.searchMedia}<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" /></svg><input id="media-search" data-testid="media-search" type="search" value={query} placeholder={copy.searchMediaPlaceholder} onChange={(event) => change({ q: event.target.value })} /></span></label>
      <label htmlFor="media-edition">{copy.edition}<select id="media-edition" data-testid="media-edition" value={edition} onChange={(event) => change({ edition: queryEdition(event.target.value) })}><option value="all">{copy.allEditions}</option><option value="2026">MSRC 2026</option><option value="2027">MSRC 2027</option></select></label>
      <label htmlFor="media-kind">{copy.mediaKind}<select id="media-kind" data-testid="media-kind" value={kind} onChange={(event) => change({ kind: event.target.value })}><option value="all">{copy.allMedia}</option><option value="recording">{copy.recordings}</option><option value="highlight">{copy.highlights}</option><option value="photograph">{copy.photographs}</option></select></label>
    </div>
    <div className={`experience-result-bar${!records.length && !hasActiveFilters ? " experience-result-bar--quiet" : ""}`}><p className={!records.length ? "sr-only" : undefined} role="status" aria-live="polite">{records.length ? formatResultCount(records.length, locale) : filtering ? copy.noResults : copy.mediaPending}</p>{hasActiveFilters ? <Button variant="ghost" size="small" data-testid="media-clear" onClick={clear}>{copy.clear}</Button> : null}</div>
    {records.length ? <div className="conference-media-grid">{records.map((record) => <MediaCard locale={locale} record={record} session={published(sessions).find((session) => session.slug === record.sessionSlug)} key={record.slug} />)}</div> : <EmptyCatalogue testId="media-empty" title={filtering ? copy.noResults : copy.mediaPending} body={filtering ? copy.noResultsBody : editionText} />}
    <p className="experience-access-note" data-testid="media-access-note">{copy.accessNote}</p>
  </Container></section><ExploreBand locale={locale} title={copy.previousTitle} href="/#film" label={copy.previousLink} /></>;
}

export function MediaCard({ locale, record, session }: { locale: Locale; record: PublicMedia; session?: PublicSession }) {
  const copy = experienceCopy[locale];
  return <article className="conference-media-card"><div className="conference-media-player">{record.access === "public" ? record.kind === "photograph" ? <Image src={record.asset} alt={record.description} fill sizes="(max-width: 600px) 90vw, 45vw" /> : <video controls playsInline preload="none" poster={record.poster ?? undefined} src={record.asset} aria-label={record.title}>{record.captions?.map((caption, index) => <track key={caption.src} kind="captions" src={caption.src} srcLang={caption.language} label={caption.label} default={index === 0} />)}</video> : <div className="conference-media-unavailable"><ResearchVisual variant={2} /><p>{record.access === "restricted" ? copy.recordingRestricted : copy.recordingPending}</p></div>}</div><div className="conference-media-copy"><p className="eyebrow">MSRC {record.edition}{record.durationSeconds ? ` · ${formatMinutes(Math.ceil(record.durationSeconds / 60), locale)}` : ""}</p><h2 lang="en" dir="ltr">{record.title}</h2>{record.speakerNames.length ? <p dir="ltr">{record.speakerNames.join(" · ")}</p> : null}{record.topic ? <p lang="en" dir="ltr">{record.topic}</p> : null}{session && session.publication === "approved" && session.slug === record.sessionSlug && record.edition === 2027 ? <Link href={`/${locale}/program/${session.slug}`}>{copy.sessionDetails}<Arrow /></Link> : null}</div></article>;
}

export function ParticipateExperience({ locale }: { locale: Locale }) {
  const copy = experienceCopy[locale];
  return <><ExperienceIntro locale={locale} page="participate" /><section className="experience-pathways"><Container><Reveal stagger>{participationPaths.map((path, index) => <article className="experience-pathway" key={path.id} id={path.id === "threeMinuteThesis" ? "three-minute-thesis" : path.id} tabIndex={-1}><span className="experience-pathway-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span><div><h2><Link href={`/${locale}${path.href}`}>{copy.pages[path.id].label}<Arrow /></Link></h2><p>{copy.pages[path.id].lead}</p><StatusBadge tone="neutral">{copy.closedLabel}</StatusBadge></div></article>)}</Reveal></Container></section></>;
}

export function JourneyExperience({ locale, journey, workshops: approvedWorkshops = [] }: { locale: Locale; journey: keyof typeof experienceCopy.en.journeys; workshops?: readonly PublicWorkshop[] }) {
  const copy = experienceCopy[locale];
  const content = copy.journeys[journey];
  const workshops = published(approvedWorkshops);
  return <><ExperienceIntro locale={locale} page={journey} />
    <section className="journey-availability" data-testid="journey-closed" aria-labelledby="journey-closed-title"><Container><div className="journey-availability-dot" aria-hidden="true" /><div><h2 id="journey-closed-title">{content.closed}</h2><p>{content.closedBody}</p></div></Container></section>
    {journey === "workshops" ? <section className="experience-catalogue"><Container>{workshops.length ? <div className="workshop-catalogue">{workshops.map((workshop) => <article className="conference-workshop-row" key={workshop.slug}><h2>{workshop.title[locale]}</h2><p>{workshop.description[locale]}</p><p>{sessionClock(workshop.startAt, locale) ?? copy.timePending}{workshop.room ? ` · ${workshop.room}` : ""}</p><StatusBadge tone="neutral">{copy.closedLabel}</StatusBadge></article>)}</div> : <EmptyCatalogue testId="workshops-empty" title={copy.workshopsPending} body={copy.workshopsPendingBody} />}</Container></section> : null}
    <section className="journey-guidelines"><Container><div className="journey-guidelines-heading"><p className="eyebrow">{copy.essentials}</p><h2>{content.detailsTitle}</h2></div><div className="journey-guidelines-list">{content.details.map((detail, index) => <article key={detail.title}><span aria-hidden="true">{formatIndex(index + 1, locale)}</span><div><h3 {...(journey === "hackathon" && index < 2 ? { lang: "en", dir: "ltr" } : {})}>{detail.title}</h3><p>{detail.body}</p></div></article>)}</div></Container></section>
    {journey !== "threeMinuteThesis" ? <section className="journey-steps"><Container><h2>{content.stepsTitle}</h2><ol>{content.steps.map((step, index) => <li key={step}><span aria-hidden="true">{formatIndex(index + 1, locale)}</span><p>{step}</p></li>)}</ol></Container></section> : null}
    <section className="journey-next"><Container><div><h2>{content.pendingTitle}</h2><p>{content.pendingBody}</p></div><div className="journey-next-actions"><ButtonLink href={`/${locale}${journey === "registration" ? "/participate" : "/registration"}`} variant="secondary">{journey === "registration" ? copy.otherPaths : copy.pages.registration.label}<Arrow /></ButtonLink></div></Container></section>
  </>;
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
