"use client";

import { useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { staffCopy } from "./copy";
import { consoleCopy } from "./console-copy";
import { formatStaffDate, formatStaffNumber } from "./console-shell";
import type { StaffPayload, StaffRegistrationStatus, StaffResponse } from "./ui-contract";

const filters = ["all", "pending_approval", "approved", "waitlisted", "approved_awaiting_payment", "confirmed", "cancelled", "expired"] as const;
type Filter = (typeof filters)[number];
const decidable = new Set<StaffRegistrationStatus>(["pending_approval", "waitlisted"]);

/**
 * ORG-055 registration queue (slice 3, staff side). Seat allocation, capacity and every
 * transition are enforced by the database RPCs; this screen only collects the request ids.
 */
export function RegistrationQueue({ locale, data, busy, status, onStatus, query, onQuery, onSearch, act, onDecided }: {
  locale: Locale; data?: StaffResponse["registration"]; busy: boolean; status: Filter; onStatus: (value: Filter) => void;
  query: string; onQuery: (value: string) => void; onSearch: () => void;
  act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>; onDecided: (text: string) => void;
}) {
  const copy = staffCopy[locale], text = consoleCopy[locale].registration;
  const [selected, setSelected] = useState<string[]>([]);
  const requests = data?.requests ?? [], counts = data?.counts;
  const capacitySet = typeof counts?.capacity === "number";
  const selectable = requests.filter((request) => decidable.has(request.status));
  const allSelected = selectable.length > 0 && selectable.every((request) => selected.includes(request.id));
  const toggle = (id: string, on: boolean) => setSelected((current) => on ? [...new Set([...current, id])] : current.filter((value) => value !== id));

  async function decide(action: "registration-approve" | "registration-waitlist", ids: string[]) {
    if (!ids.length) { onDecided(text.noneSelected); return; }
    const response = await act({ action, requestIds: ids });
    if (response.decided) { onDecided(text.decided(response.decided.approved, response.decided.waitlisted, response.decided.skipped)); setSelected([]); }
  }
  const number = (value: number | null | undefined) => typeof value === "number" ? formatStaffNumber(value, locale) : "—";

  return <section className="staff-panel staff-queue" aria-labelledby="staff-queue-title">
    <h2 id="staff-queue-title">{copy.areas.registration}</h2>
    <p>{text.intro}</p>
    <dl className="staff-seat-bar" aria-label={text.seats}>
      <div><dt>{text.capacity}</dt><dd>{capacitySet ? number(counts?.capacity) : "—"}</dd></div>
      <div><dt>{text.approved}</dt><dd>{number(counts?.approved)}</dd></div>
      <div><dt>{text.remaining}</dt><dd>{capacitySet ? number(counts?.remaining) : "—"}</dd></div>
      <div><dt>{text.pending}</dt><dd>{number(counts?.pending)}</dd></div>
      <div><dt>{text.waitlisted}</dt><dd>{number(counts?.waitlisted)}</dd></div>
    </dl>
    {counts && !capacitySet ? <p className="staff-note" role="note">{text.capacityUnset}</p> : null}
    <form className="staff-search staff-queue-filters" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
      <label className="field"><span className="field-label">{text.filter}</span>
        <select className="field-input" value={status} disabled={busy} onChange={(event) => { setSelected([]); onStatus(event.target.value as Filter); }}>
          {filters.map((value) => <option key={value} value={value}>{text.statuses[value]}</option>)}
        </select>
      </label>
      <FormField id="staff-queue-search" type="search" label={text.search} value={query} onChange={(event) => onQuery(event.target.value)} maxLength={120} disabled={busy} />
      <Button type="submit" disabled={busy}>{copy.search}</Button>
    </form>
    {selected.length ? <div className="staff-bulk-bar" role="region" aria-label={text.selected(selected.length)}>
      <span aria-live="polite">{text.selected(selected.length)}</span>
      <Button size="small" disabled={busy || !capacitySet} onClick={() => void decide("registration-approve", selected)} data-testid="queue-approve-selected">{text.approveSelected}</Button>
      <Button size="small" variant="secondary" disabled={busy} onClick={() => void decide("registration-waitlist", selected.filter((id) => requests.find((request) => request.id === id)?.status === "pending_approval"))}>{text.waitlistSelected}</Button>
    </div> : null}
    <p className="staff-muted">{copy.resultLimit}</p>
    <div className="staff-table-scroll" role="region" aria-label={copy.areas.registration} tabIndex={0}>
      <table><thead><tr>
        <th scope="col"><label className="staff-check"><input type="checkbox" checked={allSelected} disabled={busy || !selectable.length} onChange={(event) => setSelected(event.target.checked ? selectable.map((request) => request.id) : [])} /><span className="sr-only">{text.selectAll}</span></label></th>
        <th scope="col">{copy.name}</th><th scope="col">{copy.status}</th><th scope="col">{text.requested}</th><th scope="col">{copy.identifier}</th><th scope="col">{copy.action}</th>
      </tr></thead><tbody>{requests.map((request) => <tr key={request.id} data-testid="queue-row">
        <td>{decidable.has(request.status) ? <label className="staff-check"><input type="checkbox" checked={selected.includes(request.id)} disabled={busy} onChange={(event) => toggle(request.id, event.target.checked)} /><span className="sr-only">{text.select} {request.name}</span></label> : null}</td>
        <th scope="row"><bdi>{request.name}</bdi><span className="staff-email"><bdi dir="ltr">{request.email}</bdi></span>{request.priority ? <span className="staff-tag">{text.priority}</span> : null}</th>
        <td><span className={`staff-status staff-status--${request.status}`}>{text.statuses[request.status]}</span></td>
        <td>{formatStaffDate(request.createdAt, locale, copy.unknown)}</td>
        <td><bdi dir="ltr">{request.identityMasked ?? "—"}</bdi></td>
        <td>{decidable.has(request.status) ? <div className="staff-actions">
          <Button size="small" disabled={busy || !capacitySet} onClick={() => void decide("registration-approve", [request.id])}>{text.approve}</Button>
          {request.status === "pending_approval" ? <Button size="small" variant="secondary" disabled={busy} onClick={() => void decide("registration-waitlist", [request.id])}>{text.waitlist}</Button> : null}
        </div> : null}</td>
      </tr>)}</tbody></table>
    </div>
    {!requests.length ? <p>{counts ? copy.noRecords : text.closedNote}</p> : null}
  </section>;
}
export type { Filter as RegistrationFilter };
