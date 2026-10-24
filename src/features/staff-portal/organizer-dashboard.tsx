"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { FormField } from "@/components/forms/form-field";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/permissions/contract";
import { formatStaffDate, formatStaffNumber, StaffDashboard } from "./console-shell";
import { staffMenu } from "./menu";
import { requestStaff } from "./staff-client";
import { ORGANIZER_AUDIT_MODULES, type OrganizerAuditEvent, type OrganizerDashboardData, type OrganizerExportKind, type OrganizerMatch, type OrganizerPayload, type OrganizerResponse } from "./organizer-contract";
import { organizerAuditActionLabel, organizerAuditResultLabel, organizerCopy, organizerError, organizerModuleLabel, organizerValueLabel } from "./organizer-copy";

async function requestOrganizer(payload: OrganizerPayload, signal?: AbortSignal): Promise<OrganizerResponse> {
  try {
    // Form claims are single-use. Sibling panels and concurrent tabs must each
    // obtain a fresh nonce instead of replaying the dashboard's initial token.
    const admission = await requestStaff(undefined, { signal });
    if (admission.state !== "authenticated" || !admission.formToken) return { state: admission.state === "unavailable" ? "unavailable" : "denied" };
    const response = await fetch("/api/staff-portal/organizer", { method: "POST", credentials: "same-origin", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, formToken: admission.formToken }) });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    const value = await response.json() as OrganizerResponse;
    return value && typeof value.state === "string" ? value : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}

const moduleAreas: Record<string, string> = { registrations: "registration", accounts: "participants", orders: "finance", submissions: "science", reviews: "review", accepted: "science", workshops: "workshops", attendance: "check-in", certificates: "certificates", announcements: "announcements" };
function ModuleSelect({ id, locale, value, onChange, modules, disabled, all = true }: { id: string; locale: Locale; value: string; onChange: (value: string) => void; modules: readonly string[]; disabled: boolean; all?: boolean }) {
  const copy = organizerCopy[locale];
  return <div className="field"><label className="field-label" htmlFor={id}>{copy.module}</label><select className="field-input" id={id} data-testid={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
    {all ? <option value="all">{copy.all}</option> : null}{modules.map((module) => <option key={module} value={module}>{organizerModuleLabel(module, locale)}</option>)}
  </select></div>;
}

function ParticipantFinder({ locale, token }: { locale: Locale; token: string }) {
  const copy = organizerCopy[locale], [query, setQuery] = useState(""), [matches, setMatches] = useState<OrganizerMatch[] | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null), currentToken = useRef(token);
  useEffect(() => { currentToken.current = token; }, [token]);
  useEffect(() => () => controller.current?.abort(), []);
  async function find() {
    if (controller.current) return;
    const pending = new AbortController(); controller.current = pending; setBusy(true); setError(""); setMatches(null);
    const response = await requestOrganizer({ action: "find", query: query.trim(), formToken: currentToken.current }, pending.signal);
    if (!pending.signal.aborted) {
      if (response.formToken) currentToken.current = response.formToken;
      if (response.state === "ready") setMatches(response.matches ?? []); else setError(organizerError(response.state, locale));
      setBusy(false);
    }
    controller.current = null;
  }
  return <section className="staff-panel" aria-labelledby="organizer-find-title"><h2 id="organizer-find-title">{copy.find}</h2><p>{copy.findHint}</p>
    <form className="staff-search" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void find(); }}>
      <FormField id="organizer-find-query" data-testid="organizer-find-query" type="search" label={copy.query} value={query} onChange={(event) => { setQuery(event.target.value); setMatches(null); }} maxLength={254} dir="ltr" autoComplete="off" required disabled={busy} />
      <Button type="submit" data-testid="organizer-find-submit" disabled={busy || !query.trim()}>{copy.search}</Button>
    </form>{error ? <p role="alert">{error}</p> : null}
    {matches ? <div role="status">{!matches.length ? <p>{copy.empty}</p> : <ul className="staff-candidates">{matches.map((match) => <li key={match.actorId}><div><strong><bdi>{match.name}</bdi></strong><bdi dir="ltr">{match.email}</bdi><span>{copy.account}: <bdi dir="ltr">{match.actorId}</bdi></span><ul>{match.records.map((record) => <li key={`${record.module}:${record.reference}`}><span>{organizerModuleLabel(record.module, locale)} · </span><bdi dir="ltr">{record.reference}</bdi><span> · {organizerValueLabel(record.status, locale)}</span></li>)}</ul></div></li>)}</ul>}</div> : null}
  </section>;
}

function OrganizerExports({ locale, token, modules, superAdmin }: { locale: Locale; token: string; modules: string[]; superAdmin: boolean }) {
  const copy = organizerCopy[locale], [module, setModule] = useState("all"), [kind, setKind] = useState<OrganizerExportKind>("aggregate"), [status, setStatus] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [downloaded, setDownloaded] = useState(false);
  const controller = useRef<AbortController | null>(null), currentToken = useRef(token);
  useEffect(() => { currentToken.current = token; }, [token]);
  useEffect(() => () => controller.current?.abort(), []);
  async function download() {
    if (controller.current) return;
    const pending = new AbortController(); controller.current = pending; setBusy(true); setError(""); setDownloaded(false);
    try {
      const admission = await requestStaff(undefined, { signal: pending.signal });
      if (admission.state !== "authenticated" || !admission.formToken) { if (!pending.signal.aborted) setError(copy.denied); return; }
      const response = await fetch("/api/staff-portal/organizer", { method: "POST", credentials: "same-origin", cache: "no-store", signal: pending.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export", module, kind, status: kind === "aggregate" ? "all" : status.trim() || "all", formToken: admission.formToken }) });
      const renewed = response.headers.get("X-MSRC-Form-Token"); if (renewed) currentToken.current = renewed;
      if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) {
        const value = response.headers.get("content-type")?.includes("application/json") ? await response.json() as OrganizerResponse : { state: "unavailable" };
        if (value.formToken) currentToken.current = value.formToken;
        if (!pending.signal.aborted) setError(organizerError(value.state, locale));
        return;
      }
      const blob = await response.blob();
      if (pending.signal.aborted) return;
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `msrc-${module}-${kind}.csv`; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
    } catch { if (!pending.signal.aborted) setError(copy.unavailable); }
    finally { if (!pending.signal.aborted) setBusy(false); controller.current = null; }
  }
  return <section className="staff-panel" aria-labelledby="organizer-export-title"><h2 id="organizer-export-title">{copy.export}</h2><p>{copy.exportHint}</p>
    <form className="staff-organizer-filters" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void download(); }}>
      <ModuleSelect id="organizer-export-module" locale={locale} value={module} onChange={setModule} modules={modules} disabled={busy} all={kind === "aggregate"} />
      <div className="field"><label className="field-label" htmlFor="organizer-export-kind">{copy.kind}</label><select className="field-input" id="organizer-export-kind" data-testid="organizer-export-kind" value={kind} disabled={busy} onChange={(event) => { const next = event.target.value as OrganizerExportKind; setKind(next); if (next !== "aggregate" && module === "all") setModule(modules[0] ?? "all"); }}>
        <option value="aggregate">{copy.kinds.aggregate}</option><option value="operational">{copy.kinds.operational}</option>{superAdmin ? <option value="personal">{copy.kinds.personal}</option> : null}
      </select></div>
      <FormField id="organizer-export-status" data-testid="organizer-export-status" label={copy.statusFilter} hint={copy.statusHint} value={status} onChange={(event) => setStatus(event.target.value)} dir="ltr" maxLength={60} disabled={busy || kind === "aggregate"} />
      <Button type="submit" data-testid="organizer-export-download" disabled={busy || !modules.length}>{copy.download}</Button>
    </form>{kind === "personal" ? <p className="staff-note">{copy.personalHint}</p> : null}{error ? <p role="alert">{error}</p> : null}{downloaded ? <p role="status">{copy.downloaded}</p> : null}
  </section>;
}

/** Counts come only from the role-scoped aggregate RPC; legacy summary totals are not used. */
export function OrganizerDashboard({ locale, roles, formToken }: { locale: Locale; roles: readonly Role[]; formToken?: string }) {
  const copy = organizerCopy[locale], [data, setData] = useState<OrganizerDashboardData>(), [error, setError] = useState(""), [busy, setBusy] = useState(true), [reload, setReload] = useState(0);
  const currentToken = useRef(formToken), superAdmin = roles.includes("superAdmin"), menu = staffMenu(roles);
  useEffect(() => { currentToken.current = formToken; }, [formToken]);
  useEffect(() => {
    if (!formToken) return;
    const controller = new AbortController();
    void requestOrganizer({ action: "dashboard", formToken }, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      if (response.formToken) currentToken.current = response.formToken;
      if (response.state === "ready" && response.dashboard) { setData(response.dashboard); setError(""); } else { setData(undefined); setError(organizerError(response.state, locale)); }
      setBusy(false);
    });
    return () => controller.abort();
  }, [formToken, locale, reload]);
  const modules = data?.modules ?? [];
  return <div className="staff-organizer" data-testid="organizer-dashboard">
    <section className="staff-dashboard" aria-labelledby="organizer-dashboard-title" aria-busy={busy}><div className="staff-organizer-heading"><div><h2 id="organizer-dashboard-title">{copy.title}</h2><p className="staff-muted">{copy.intro}</p></div><Button variant="secondary" size="small" disabled={!formToken || busy} onClick={() => { setBusy(true); setReload((value) => value + 1); }}>{copy.refresh}</Button></div>
      {!superAdmin ? <p className="staff-note">{copy.suppression}</p> : null}
      {error ? <p role="alert">{error}</p> : !data ? <p role="status">{copy.loading}</p> : <>
        {data.modules.includes("orders") ? <p className="staff-note" data-testid="organizer-mock-payment-note">{copy.mock}</p> : null}
        {!modules.length ? <p>{copy.empty}</p> : <ul className="staff-card-grid">{modules.map((module) => <li className="staff-card" key={module} data-testid={`organizer-card-${module}`}><h3>{organizerModuleLabel(module, locale)}</h3>{!data.cells.some((cell) => cell.module === module) ? <p className="staff-muted">{copy.empty}</p> : null}<dl className="staff-metrics">{data.cells.filter((cell) => cell.module === module).map((cell) => <div key={`${cell.dimension}:${cell.value}`}><dt><span>{organizerValueLabel(cell.dimension, locale)}</span><span><bdi lang={cell.dimension === "specialty" ? "en" : undefined} dir={cell.dimension === "specialty" ? "ltr" : undefined}>{cell.dimension === "specialty" ? cell.value : organizerValueLabel(cell.value, locale)}</bdi></span></dt><dd data-testid={`organizer-cell-${module}-${cell.dimension}-${cell.value}`} title={cell.count === null ? copy.suppression : undefined}>{cell.count === null ? "—" : formatStaffNumber(cell.count, locale)}</dd></div>)}</dl>{moduleAreas[module] && menu.some((entry) => entry.key === moduleAreas[module]) ? <Link className="staff-card-link" href={`/${locale}/staff/${moduleAreas[module]}`}>{copy.open}<span className="sr-only"> {organizerModuleLabel(module, locale)}</span></Link> : null}</li>)}</ul>}
      </>}
    </section>
    {data && formToken ? <OrganizerExports locale={locale} token={formToken} modules={data.modules} superAdmin={superAdmin} /> : null}
    {superAdmin && formToken ? <ParticipantFinder locale={locale} token={formToken} /> : null}
    <details className="staff-history"><summary>{copy.areas}</summary><StaffDashboard locale={locale} menu={menu} /></details>
  </div>;
}

export function OrganizerAuditPanel({ locale, formToken, fallback }: { locale: Locale; formToken?: string; fallback?: ReactNode }) {
  const copy = organizerCopy[locale], [module, setModule] = useState("all"), [actor, setActor] = useState(""), [event, setEvent] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [events, setEvents] = useState<OrganizerAuditEvent[]>([]), [hasMore, setHasMore] = useState(false), [offset, setOffset] = useState(0), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState(""), [missing, setMissing] = useState(false);
  const currentToken = useRef(formToken), controller = useRef<AbortController | null>(null), filters = useRef<Omit<OrganizerPayload, "action">>({ module: "all" });
  useEffect(() => { currentToken.current = formToken; }, [formToken]);
  const load = useCallback(async (nextOffset: number, nextFilters: Omit<OrganizerPayload, "action">, token: string) => {
    controller.current?.abort(); const pending = new AbortController(); controller.current = pending;
    const response = await requestOrganizer({ action: "audit", ...nextFilters, offset: nextOffset, formToken: token }, pending.signal);
    if (pending.signal.aborted) return;
    if (response.formToken) currentToken.current = response.formToken;
    if (response.state === "ready") { setEvents(response.events ?? []); setHasMore(response.hasMore === true); setOffset(nextOffset); setError(""); setMissing(false); }
    else { setEvents([]); setHasMore(false); setError(organizerError(response.state, locale)); setMissing(response.state === "area-not-ready"); }
    setBusy(false); setLoaded(true); controller.current = null;
  }, [locale]);
  useEffect(() => { if (formToken) void load(0, filters.current, formToken); return () => controller.current?.abort(); }, [formToken, load]);
  function apply() {
    if (!currentToken.current) return;
    filters.current = { module, ...(actor.trim() ? { actor: actor.trim() } : {}), ...(event.trim() ? { event: event.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };
    setBusy(true); void load(0, filters.current, currentToken.current);
  }
  return <section className="staff-panel" data-testid="organizer-audit" aria-labelledby="organizer-audit-title"><h2 id="organizer-audit-title">{copy.audit}</h2><p>{copy.auditHint}</p>
    <form className="staff-organizer-filters" aria-busy={busy} onSubmit={(submit) => { submit.preventDefault(); apply(); }}>
      <ModuleSelect id="organizer-audit-module" locale={locale} value={module} onChange={setModule} modules={ORGANIZER_AUDIT_MODULES} disabled={busy} />
      <FormField id="organizer-audit-actor" data-testid="organizer-audit-actor" label={copy.actor} value={actor} onChange={(change) => setActor(change.target.value)} dir="ltr" maxLength={36} disabled={busy} />
      <FormField id="organizer-audit-event" data-testid="organizer-audit-event" label={copy.action} value={event} onChange={(change) => setEvent(change.target.value)} dir="ltr" maxLength={100} disabled={busy} />
      <FormField id="organizer-audit-from" data-testid="organizer-audit-from" type="date" label={copy.from} value={from} onChange={(change) => setFrom(change.target.value)} disabled={busy} />
      <FormField id="organizer-audit-to" data-testid="organizer-audit-to" type="date" label={copy.to} value={to} onChange={(change) => setTo(change.target.value)} disabled={busy} />
      <Button type="submit" data-testid="organizer-audit-filter" disabled={busy || !formToken}>{copy.filter}</Button>
    </form>
    {error ? <p role="alert">{error}</p> : !loaded ? <p role="status">{copy.loading}</p> : <>
      <div className="staff-table-scroll" role="region" aria-label={copy.audit} tabIndex={0}><table><thead><tr><th scope="col">{copy.when}</th><th scope="col">{copy.module}</th><th scope="col">{copy.actor}</th><th scope="col">{copy.action}</th><th scope="col">{copy.target}</th><th scope="col">{copy.result}</th><th scope="col">{copy.details}</th></tr></thead><tbody>{events.map((row) => <tr key={`${row.module}:${row.id}`}><td>{formatStaffDate(row.at, locale, "—")}</td><td>{organizerModuleLabel(row.module, locale)}</td><td><bdi dir="ltr">{row.actorId ?? "—"}</bdi></td><td><bdi>{organizerAuditActionLabel(row.action, locale)}</bdi></td><td><bdi dir="ltr">{row.targetId ?? "—"}</bdi></td><td>{organizerAuditResultLabel(row.result, locale)}</td><td><details><summary>{copy.details}</summary><pre className="staff-organizer-details" dir="ltr">{JSON.stringify(row.details, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
      {!events.length ? <p>{copy.empty}</p> : null}<div className="staff-actions"><Button variant="secondary" disabled={busy || offset === 0} onClick={() => { setBusy(true); void load(Math.max(0, offset - 100), filters.current, currentToken.current ?? ""); }}>{copy.previous}</Button><Button variant="secondary" data-testid="organizer-audit-next" disabled={busy || !hasMore} onClick={() => { setBusy(true); void load(offset + 100, filters.current, currentToken.current ?? ""); }}>{copy.next}</Button></div>
    </>}{missing && fallback ? <details className="staff-history"><summary>{copy.legacyAudit}</summary>{fallback}</details> : null}
  </section>;
}
