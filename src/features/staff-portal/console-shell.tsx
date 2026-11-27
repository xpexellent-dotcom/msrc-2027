"use client";

import { useId, type KeyboardEvent } from "react";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/permissions/contract";
import { staffCopy } from "./copy";
import { consoleCopy, englishOnlyLanding, workspaceCopy, type LandingKey } from "./console-copy";
import { isOversightOnly, type STAFF_MENU, type StaffMenuKey } from "./menu";

type MenuEntry = (typeof STAFF_MENU)[number];
type CurrentArea = StaffMenuKey | "home";

const areaGroup = {
  registration: "operations", participants: "operations", workshops: "operations",
  "check-in": "operations", certificates: "operations", finance: "operations",
  science: "scientific", review: "scientific", judging: "scientific", "faculty-judging": "scientific",
  content: "communications", announcements: "communications", "email-previews": "communications",
  sponsorship: "communications",
  "launch-readiness": "administration", "registration-settings": "administration",
  "early-access": "administration", priority: "administration", people: "administration",
  audit: "administration", security: "administration",
} as const satisfies Record<StaffMenuKey, string>;

type AreaGroup = (typeof areaGroup)[StaffMenuKey];
const groupOrder: readonly AreaGroup[] = ["operations", "scientific", "communications", "administration"];

function groupedAreas(menu: readonly MenuEntry[]) {
  return groupOrder
    .map((group) => ({ group, entries: menu.filter((entry) => areaGroup[entry.key] === group) }))
    .filter(({ entries }) => entries.length > 0);
}

export function formatStaffDate(value: string | null | undefined, locale: Locale, fallback: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(parsed) : fallback;
}
export function formatStaffNumber(value: number, locale: Locale) { return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB").format(value); }

function AreaLink({ locale, entry, current, directory = false }: { locale: Locale; entry: MenuEntry; current?: CurrentArea; directory?: boolean }) {
  const language = entry.englishOnly ? "en" : locale;
  const copy = staffCopy[language];
  return <Link href={`/${locale}/staff/${entry.key}`} aria-current={current === entry.key ? "page" : undefined}>
    <span className="staff-nav-label" lang={entry.englishOnly ? "en" : undefined} dir={entry.englishOnly ? "ltr" : undefined}>
      <span>{copy.areas[entry.key]}</span>
      {!entry.built ? <span className="staff-badge">{directory ? consoleCopy[language].landing.status : copy.soon}</span> : null}
    </span>
    {directory ? <Chevron /> : null}
  </Link>;
}

function Chevron({ down = false }: { down?: boolean }) {
  return <svg className={down ? "staff-chevron staff-chevron--down" : "staff-chevron"} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={down ? "m5 8 5 5 5-5" : "m8 5 5 5-5 5"} />
  </svg>;
}

function NavigationLinks({ locale, menu, current }: { locale: Locale; menu: readonly MenuEntry[]; current: CurrentArea }) {
  const id = useId();
  const text = workspaceCopy[locale];
  return <div className="staff-navigation-links">
    <Link className="staff-nav-home" href={`/${locale}/staff`} aria-current={current === "home" ? "page" : undefined}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" /></svg>
      {consoleCopy[locale].overview}
    </Link>
    {groupedAreas(menu).map(({ group, entries }) => <div className="staff-navigation-group" key={group}>
      <p id={`${id}-${group}`}>{text.groups[group]}</p>
      <ul aria-labelledby={`${id}-${group}`}>{entries.map((entry) => <li key={entry.key}><AreaLink locale={locale} entry={entry} current={current} /></li>)}</ul>
    </div>)}
    {!menu.length ? <p className="staff-navigation-empty">{staffCopy[locale].noAreas}</p> : null}
  </div>;
}

function dismissNavigation(event: KeyboardEvent<HTMLDetailsElement>) {
  if (event.key !== "Escape" || !event.currentTarget.open) return;
  event.preventDefault();
  event.currentTarget.open = false;
  event.currentTarget.querySelector("summary")?.focus();
}

/** ORG-055: navigation projects the available areas without granting access. */
export function StaffSidebar({ locale, menu, current }: { locale: Locale; menu: readonly MenuEntry[]; current: CurrentArea }) {
  return <aside className="staff-sidebar">
    <nav aria-label={staffCopy[locale].menu} className="staff-menu">
      <div className="staff-nav-desktop"><NavigationLinks locale={locale} menu={menu} current={current} /></div>
      <details key={current} className="staff-nav-narrow" onKeyDown={dismissNavigation}>
        <summary className="staff-nav-toggle">{workspaceCopy[locale].areas}<Chevron down /></summary>
        <NavigationLinks locale={locale} menu={menu} current={current} />
      </details>
    </nav>
  </aside>;
}

export function StaffDashboard({ locale, menu }: { locale: Locale; menu: readonly MenuEntry[] }) {
  const text = workspaceCopy[locale];
  const groups = groupedAreas(menu);
  return <section className="staff-directory" aria-labelledby="organizer-work-areas">
    <h2 id="organizer-work-areas" tabIndex={-1}>{text.directory}</h2>
    <p className="staff-muted">{consoleCopy[locale].overviewIntro}</p>
    {groups.length ? <div className="staff-directory-grid">{groups.map(({ group, entries }) => <section key={group} aria-labelledby={`staff-directory-${group}`}>
      <h3 id={`staff-directory-${group}`}>{text.groups[group]}</h3>
      <ul role="list">{entries.map((entry) => <li key={entry.key}><AreaLink locale={locale} entry={entry} directory /></li>)}</ul>
    </section>)}</div> : <p>{staffCopy[locale].noAreas}</p>}
  </section>;
}

/** Planned areas explain what the tool will do and what it is waiting for. */
export function StaffLanding({ locale, area, roles }: { locale: Locale; area: LandingKey; roles: readonly Role[] }) {
  const english = englishOnlyLanding.has(area), text = english ? consoleCopy.en : consoleCopy[locale], entry = text.landing.areas[area];
  return <section className="staff-panel staff-landing" lang={english ? "en" : undefined} dir={english ? "ltr" : undefined} aria-labelledby="staff-landing-title">
    <p className="staff-badge">{text.landing.status}</p>
    <h2 id="staff-landing-title">{entry.title}</h2>
    <p>{entry.body}</p>
    <p className="staff-muted">{entry.waiting}</p>
    {isOversightOnly(area, roles) ? <p className="staff-oversight" role="note">{text.landing.oversight}</p> : null}
  </section>;
}
