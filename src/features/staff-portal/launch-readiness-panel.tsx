import type { Locale } from "@/lib/i18n";
import { staffCopy } from "./copy";
import { launchReadinessCopy } from "./launch-readiness-copy";
import type { StaffLaunchReadiness, StaffReadinessStatus } from "./ui-contract";

function Status({ locale, status }: { locale: Locale; status: StaffReadinessStatus }) {
  return <span className="staff-readiness-status" data-status={status}>{launchReadinessCopy[locale].status[status]}</span>;
}

export function LaunchReadinessPanel({ locale, data, areaFailure = false }: { locale: Locale; data?: StaffLaunchReadiness; areaFailure?: boolean }) {
  const copy = launchReadinessCopy[locale], number = (value: number) => value.toLocaleString(locale === "ar" ? "ar-SA" : "en-GB");
  const date = (value: string | null | undefined, dayOnly = false) => value ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium", ...(dayOnly ? {} : { timeStyle: "short" as const }), timeZone: "Asia/Riyadh", calendar: "gregory",
  }).format(new Date(dayOnly ? `${value}T12:00:00Z` : value)) : copy.unset;
  return <div className="staff-launch-readiness">
    <section className="staff-panel"><p>{copy.intro}</p><a href="https://github.com/xpexellent-dotcom/msrc-2027/blob/main/docs/runbooks/ACTIVATION.md" target="_blank" rel="noreferrer">{copy.guide}</a></section>
    {!data ? areaFailure ? null : <p role="status">{copy.loading}</p> : <>
      <section className="staff-panel" aria-labelledby="launch-checklist"><h2 id="launch-checklist">{copy.checklist}</h2>
        <ul className="staff-readiness-list">{data.checks.map((check) => <li key={check.key} data-testid={`launch-check-${check.key}`}><span>{copy.checks[check.key]}</span><Status locale={locale} status={check.status} /></li>)}</ul>
        <p className="staff-note">{copy.latestDrain}</p>
        <details><summary>{copy.checks.migrations}</summary><p>{copy.functionNote}</p><ul>{Object.entries(data.requiredRpcs).map(([key, present]) => <li key={key}>{copy.rpcs[key as keyof typeof copy.rpcs]}: {present ? copy.present : copy.missing}</li>)}</ul></details>
      </section>
      <section className="staff-panel" aria-labelledby="launch-settings"><h2 id="launch-settings">{copy.summary}</h2><dl className="staff-readiness-summary">
        <div><dt>{copy.capacity}</dt><dd>{data.settings?.general_capacity == null ? copy.unset : number(data.settings.general_capacity)}</dd></div>
        <div><dt>{copy.earlyStart}</dt><dd>{date(data.settings?.priority_start_at)}</dd></div>
        <div><dt>{copy.earlyEnd}</dt><dd>{date(data.settings?.priority_end_at)}</dd></div>
        <div><dt>{copy.generalOpening}</dt><dd>{date(data.settings?.general_opening_at)}</dd></div>
        <div><dt>{copy.closing}</dt><dd>{date(data.settings?.closing_at)}</dd></div>
        <div><dt>{copy.conferenceDays}</dt><dd>{data.settings?.conference_days?.length ? data.settings.conference_days.map((day) => date(day, true)).join(locale === "ar" ? "، " : "; ") : copy.unset}</dd></div>
      </dl></section>
      <section className="staff-panel" aria-labelledby="launch-environment"><h2 id="launch-environment">{copy.environment}</h2><p>{copy.environmentNote}</p>
        <ul className="staff-readiness-list staff-readiness-environment">{data.environment.map((check) => <li key={check.name}><span><code dir="ltr">{check.name}</code><small>{check.present ? copy.present : copy.missing} · {check.valid ? copy.valid : copy.invalid}{check.enabled === undefined ? "" : ` · ${check.enabled ? copy.enabled : copy.disabled}`}</small></span><Status locale={locale} status={check.status} /></li>)}</ul>
      </section>
      <section className="staff-panel" aria-labelledby="launch-counts"><h2 id="launch-counts">{copy.counts}</h2><dl className="staff-readiness-summary">
        <div><dt>{copy.earlyAccess}</dt><dd>{number(data.earlyAccessCount)}</dd></div><div><dt>{copy.outboxCap}</dt><dd>{number(data.outboxDailyCap)}</dd></div>
        <div><dt>{copy.participantCap}</dt><dd>{number(data.participantEmailDailyLimit)}</dd></div><div><dt>{copy.superAdmins}</dt><dd>{number(data.superAdminsWithAuthenticatorCount)}</dd></div>
      </dl><h3>{copy.staff}</h3><dl className="staff-readiness-summary">{Object.entries(data.staffCounts).map(([role, count]) => <div key={role}><dt>{staffCopy[locale].roleLabels[role as keyof typeof data.staffCounts]}</dt><dd>{number(count)}</dd></div>)}</dl></section>
      <section className="staff-panel staff-registration-switch" aria-labelledby="launch-switch"><h2 id="launch-switch">{copy.registrationSwitch}</h2><p className="staff-badge" data-testid="launch-registration-switch">{data.registrationEnabled ? copy.open : copy.closed}</p><p>{copy.switchNote}</p></section>
    </>}
  </div>;
}
