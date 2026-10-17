"use client";

import { useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { staffCopy } from "./copy";
import { consoleCopy } from "./console-copy";
import { formatStaffDate } from "./console-shell";
import type { StaffPayload, StaffResponse } from "./ui-contract";

function ReasonAction({ locale, label, busy, onSubmit, id, variant }: { locale: Locale; label: string; busy: boolean; onSubmit: (reason: string) => Promise<unknown>; id: string; variant?: "secondary" }) {
  const text = consoleCopy[locale].priority;
  const [reason, setReason] = useState(""), [missing, setMissing] = useState(false);
  return <form className="staff-reason-form" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); if (!value) { setMissing(true); return; } setMissing(false); void onSubmit(value).then(() => setReason("")); }}>
    <FormField id={id} label={text.reason} hint={text.reasonHint} error={missing ? text.reasonRequired : undefined} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} autoComplete="off" disabled={busy} />
    <Button type="submit" size="small" variant={variant} disabled={busy}>{label}</Button>
  </form>;
}

/** ORG-051/055: Super Admin-only designation with a reason; the database audits every change. */
export function PriorityPanel({ locale, data, busy, query, onQuery, onSearch, act }: {
  locale: Locale; data?: StaffResponse["priority"]; busy: boolean; query: string; onQuery: (value: string) => void; onSearch: () => void;
  act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>;
}) {
  const copy = staffCopy[locale], text = consoleCopy[locale].priority;
  const active = data?.designations.filter((row) => row.active) ?? [], removed = data?.designations.filter((row) => !row.active) ?? [];
  const marked = new Set(active.map((row) => row.actorId));
  return <>
    <section className="staff-panel" aria-labelledby="staff-priority-title">
      <h2 id="staff-priority-title">{copy.areas.priority}</h2>
      <p>{text.intro}</p>
      <h3>{text.find}</h3><p className="staff-muted">{text.findHint}</p>
      <form className="staff-search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <FormField id="staff-priority-search" type="search" label={copy.searchParticipants} value={query} onChange={(event) => onQuery(event.target.value)} maxLength={120} disabled={busy} />
        <Button type="submit" disabled={busy}>{copy.search}</Button>
      </form>
      {data?.candidates?.length ? <ul className="staff-candidates">{data.candidates.map((person) => <li key={person.actorId}>
        <div><bdi>{person.name}</bdi><span className="staff-email"><bdi dir="ltr">{person.email}</bdi></span></div>
        {marked.has(person.actorId) ? <span className="staff-tag">{consoleCopy[locale].registration.priority}</span>
          : <ReasonAction locale={locale} id={`priority-add-${person.actorId}`} label={text.mark} busy={busy} onSubmit={(reason) => act({ action: "priority-set", targetId: person.actorId, reason })} />}
      </li>)}</ul> : query && data ? <p>{copy.noRecords}</p> : null}
    </section>
    <section className="staff-panel" aria-labelledby="staff-priority-current">
      <h2 id="staff-priority-current">{text.current}</h2>
      {active.length ? <ul className="staff-candidates">{active.map((row) => <li key={row.actorId}>
        <div><bdi>{row.name}</bdi><span className="staff-email"><bdi dir="ltr">{row.email}</bdi></span>
          <span className="staff-muted">{row.reason} · {text.markedOn}: {formatStaffDate(row.designatedAt, locale, copy.unknown)}{row.designatedByName ? <> · {text.markedBy}: <bdi>{row.designatedByName}</bdi></> : null}</span></div>
        <ReasonAction locale={locale} id={`priority-remove-${row.actorId}`} label={text.remove} variant="secondary" busy={busy} onSubmit={(reason) => act({ action: "priority-remove", targetId: row.actorId, reason })} />
      </li>)}</ul> : <p>{text.none}</p>}
      {removed.length ? <details className="staff-history"><summary>{text.history} ({removed.length})</summary><ul>{removed.map((row) => <li key={row.actorId}><bdi>{row.name}</bdi> · {text.removedOn}: {formatStaffDate(row.removedAt, locale, copy.unknown)}</li>)}</ul></details> : null}
    </section>
  </>;
}
