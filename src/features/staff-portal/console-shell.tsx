"use client";

import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/permissions/contract";
import { staffCopy } from "./copy";
import { consoleCopy, englishOnlyLanding, type LandingKey } from "./console-copy";
import { isOversightOnly, type STAFF_MENU, type StaffMenuKey } from "./menu";
import type { StaffSummary } from "./ui-contract";

type MenuEntry = (typeof STAFF_MENU)[number];

export function formatStaffDate(value: string | null | undefined, locale: Locale, fallback: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(parsed) : fallback;
}
export function formatStaffNumber(value: number, locale: Locale) { return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB").format(value); }

function AreaLabel({ locale, entry }: { locale: Locale; entry: MenuEntry }) {
  return entry.englishOnly ? <span lang="en" dir="ltr">{staffCopy.en.areas[entry.key]}</span> : <span>{staffCopy[locale].areas[entry.key]}</span>;
}

/** ORG-055: one tab per area the roles allow; Super Admin sees all. Projection only. */
export function StaffSidebar({ locale, menu, current }: { locale: Locale; menu: readonly MenuEntry[]; current: StaffMenuKey | "home" }) {
  const copy = staffCopy[locale], text = consoleCopy[locale];
  return <aside className="staff-sidebar">
    <nav aria-label={copy.menu} className="staff-menu">
      <Link className="staff-nav-home" href={`/${locale}/staff`} aria-current={current === "home" ? "page" : undefined}>{text.overview}</Link>
      <ul>{menu.map((entry) => <li key={entry.key}>
        <Link href={`/${locale}/staff/${entry.key}`} aria-current={current === entry.key ? "page" : undefined}>
          {entry.englishOnly ? <span className="staff-nav-label" lang="en" dir="ltr">{staffCopy.en.areas[entry.key]}{!entry.built ? <span className="staff-badge">{staffCopy.en.soon}</span> : null}</span>
            : <span className="staff-nav-label">{copy.areas[entry.key]}{!entry.built ? <span className="staff-badge">{copy.soon}</span> : null}</span>}
        </Link>
      </li>)}</ul>
      {!menu.length ? <p>{copy.noAreas}</p> : null}
    </nav>
  </aside>;
}

function count(value: number | null | undefined, locale: Locale) { return typeof value === "number" ? formatStaffNumber(value, locale) : "—"; }

/** Dashboard home: a card per area with its live counts (aggregate only). */
export function StaffDashboard({ locale, menu, summary }: { locale: Locale; menu: readonly MenuEntry[]; summary?: StaffSummary }) {
  const copy = staffCopy[locale], text = consoleCopy[locale];
  const metrics: Partial<Record<StaffMenuKey, { label: string; value: string }[]>> = {
    registration: summary?.registration ? [
      { label: text.cards.pending, value: count(summary.registration.pending, locale) },
      { label: text.cards.approved, value: count(summary.registration.approved, locale) },
      { label: summary.registration.capacity === null ? text.cards.capacityUnset : text.cards.remaining, value: summary.registration.capacity === null ? "—" : count(summary.registration.remaining, locale) },
    ] : undefined,
    participants: typeof summary?.participants === "number" ? [{ label: text.cards.participants, value: count(summary.participants, locale) }] : undefined,
    people: typeof summary?.staff === "number" ? [{ label: text.cards.staff, value: count(summary.staff, locale) }] : undefined,
    audit: typeof summary?.auditLast24h === "number" ? [{ label: text.cards.audit, value: count(summary.auditLast24h, locale) }] : undefined,
    priority: typeof summary?.priority === "number" ? [{ label: text.cards.priority, value: count(summary.priority, locale) }] : undefined,
  };
  const cards = menu.filter((entry) => entry.key !== "security");
  return <section className="staff-dashboard" aria-labelledby="staff-overview-title">
    <h2 id="staff-overview-title">{text.overview}</h2><p className="staff-muted">{text.overviewIntro}</p>
    <ul className="staff-card-grid">{cards.map((entry) => <li key={entry.key} className={entry.built ? "staff-card" : "staff-card staff-card--planned"}>
      <h3><AreaLabel locale={locale} entry={entry} /></h3>
      {metrics[entry.key]?.length ? <dl className="staff-metrics">{metrics[entry.key]!.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>
        : !entry.built ? <p className="staff-muted">{entry.englishOnly ? consoleCopy.en.landing.status : text.landing.status}</p> : null}
      <Link className="staff-card-link" href={`/${locale}/staff/${entry.key}`}>{text.open}<span className="sr-only"> {entry.englishOnly ? staffCopy.en.areas[entry.key] : copy.areas[entry.key]}</span></Link>
    </li>)}</ul>
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
