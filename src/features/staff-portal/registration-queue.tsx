"use client";

import { useEffect, useRef, useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { registrationCopy } from "@/features/registration/registration-copy";
import { confirmationCopy } from "./confirmation-copy";
import { ConfirmationRound } from "./confirmation-round";
import { staffCopy } from "./copy";
import { consoleCopy } from "./console-copy";
import { formatStaffDate, formatStaffNumber } from "./console-shell";
import type { StaffPayload, StaffRegistrationDetail, StaffRegistrationStatus, StaffResponse, StaffState } from "./ui-contract";

const filters = ["all", "pending_approval", "approved", "waitlisted", "offered", "approved_awaiting_payment", "confirmed", "cancelled", "expired", "confirmation_awaiting", "confirmation_confirmed", "confirmation_released"] as const;
type Filter = (typeof filters)[number];
const decidable = new Set<StaffRegistrationStatus>(["pending_approval", "waitlisted"]);

/**
 * ORG-055 registration queue (slice 3, staff side). Seat allocation, capacity and every
 * transition are enforced by the database RPCs; this screen only collects the request ids.
 */
export function RegistrationQueue({ locale, data, busy, status, onStatus, query, onQuery, onSearch, act, onDecided, canExport, loadDetail, loadConfirmationPreview }: {
  locale: Locale; data?: StaffResponse["registration"]; busy: boolean; status: Filter; onStatus: (value: Filter) => void;
  query: string; onQuery: (value: string) => void; onSearch: () => void;
  act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>; onDecided: (text: string) => void;
  loadConfirmationPreview: () => Promise<StaffResponse>;
  canExport: boolean; loadDetail: (requestId: string) => Promise<StaffResponse>;
}) {
  const confirmation = confirmationCopy[locale], copy = staffCopy[locale], text = consoleCopy[locale].registration;
  const [selected, setSelected] = useState<string[]>([]);
  const requests = data?.requests ?? [], counts = data?.counts;
  const capacitySet = typeof counts?.capacity === "number";
  const selectable = requests.filter((request) => decidable.has(request.status));
  const allSelected = selectable.length > 0 && selectable.every((request) => selected.includes(request.id));
  const toggle = (id: string, on: boolean) => setSelected((current) => on ? [...new Set([...current, id])] : current.filter((value) => value !== id));

  const [detail, setDetail] = useState<StaffRegistrationDetail | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  // Move focus once the panel has rendered, so keyboard and screen-reader users land on it.
  useEffect(() => { if (detail) detailHeading.current?.focus(); }, [detail]);
  const statusOf = (id: string) => requests.find((request) => request.id === id)?.status;

  async function decide(action: "registration-approve" | "registration-waitlist" | "registration-offer", ids: string[]) {
    if (!ids.length) { onDecided(text.noneSelected); return; }
    const response = await act({ action, requestIds: ids });
    if (response.decided) { onDecided(text.decided(response.decided.approved, response.decided.waitlisted, response.decided.skipped, response.decided.offered)); setSelected([]); setDetail(null); }
  }
  /** Fetch first so a refused export shows a message instead of saving the error as a file. */
  async function exportCsv() {
    const failed = (state: string) => onDecided(copy.states[state as keyof typeof copy.states] || copy.states.unavailable);
    try {
      const response = await fetch("/api/staff-portal?area=registration-export", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) {
        failed(((await response.json().catch(() => null)) as { state?: StaffState } | null)?.state ?? "unavailable"); return;
      }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "registration.csv";
      link.click(); URL.revokeObjectURL(url);
    } catch { failed("unavailable"); }
  }
  async function openDetail(id: string) {
    const response = await loadDetail(id);
    if (response.registrationDetail) setDetail(response.registrationDetail);
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
      <div><dt>{text.offered}</dt><dd>{number(counts?.offered)}</dd></div>
      <div><dt>{text.expired}</dt><dd>{number(counts?.expired)}</dd></div>
    </dl>
    <dl className="staff-seat-bar" aria-label={confirmation.title}>
      <div><dt>{confirmation.awaiting}</dt><dd>{number(counts?.confirmationAwaiting)}</dd></div>
      <div><dt>{confirmation.confirmed}</dt><dd>{number(counts?.confirmationConfirmed)}</dd></div>
      <div><dt>{confirmation.released}</dt><dd>{number(counts?.confirmationReleased)}</dd></div>
    </dl>
    {canExport ? <ConfirmationRound locale={locale} busy={busy} loadPreview={loadConfirmationPreview} act={act} onResult={onDecided} /> : null}
    {canExport ? <p className="staff-export"><Button size="small" variant="secondary" disabled={busy} onClick={() => void exportCsv()} data-testid="queue-export">{text.exportCsv}</Button><span className="staff-muted">{text.exportNote}</span></p> : null}
    {counts && !capacitySet ? <p className="staff-note" role="note">{text.capacityUnset}</p> : null}
    <form className="staff-search staff-queue-filters" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
      <label className="field"><span className="field-label">{text.filter}</span>
        <select className="field-input" value={status} disabled={busy} onChange={(event) => { setSelected([]); onStatus(event.target.value as Filter); }}>
          {filters.map((value) => <option key={value} value={value}>{value in confirmation.filters ? confirmation.filters[value as keyof typeof confirmation.filters] : text.statuses[value as keyof typeof text.statuses]}</option>)}
        </select>
      </label>
      <FormField id="staff-queue-search" type="search" label={text.search} value={query} onChange={(event) => onQuery(event.target.value)} maxLength={120} disabled={busy} />
      <Button type="submit" disabled={busy}>{copy.search}</Button>
    </form>
    {selected.length ? <div className="staff-bulk-bar" role="region" aria-label={text.selected(selected.length)}>
      <span aria-live="polite">{text.selected(selected.length)}</span>
      <Button size="small" disabled={busy || !capacitySet} onClick={() => void decide("registration-approve", selected)} data-testid="queue-approve-selected">{text.approveSelected}</Button>
      <Button size="small" variant="secondary" disabled={busy || !capacitySet} onClick={() => void decide("registration-offer", selected.filter((id) => statusOf(id) === "waitlisted"))} data-testid="queue-offer-selected">{text.offerSelected}</Button>
      <Button size="small" variant="secondary" disabled={busy} onClick={() => void decide("registration-waitlist", selected.filter((id) => statusOf(id) === "pending_approval"))}>{text.waitlistSelected}</Button>
    </div> : null}
    <p className="staff-muted">{copy.resultLimit}</p>
    <div className="staff-table-scroll" role="region" aria-label={copy.areas.registration} tabIndex={0}>
      <table><thead><tr>
        <th scope="col"><label className="staff-check"><input type="checkbox" checked={allSelected} disabled={busy || !selectable.length} onChange={(event) => setSelected(event.target.checked ? selectable.map((request) => request.id) : [])} /><span className="sr-only">{text.selectAll}</span></label></th>
        <th scope="col">{copy.name}</th><th scope="col">{copy.status}</th><th scope="col">{text.ticket}</th><th scope="col" className="staff-nowrap">{text.requested}</th><th scope="col">{copy.identifier}</th><th scope="col">{copy.action}</th>
      </tr></thead><tbody>{requests.map((request) => <tr key={request.id} data-testid="queue-row">
        <td>{decidable.has(request.status) ? <label className="staff-check"><input type="checkbox" checked={selected.includes(request.id)} disabled={busy} onChange={(event) => toggle(request.id, event.target.checked)} /><span className="sr-only">{text.select} {request.name}</span></label> : null}</td>
        <th scope="row"><bdi>{request.name}</bdi><span className="staff-email"><bdi dir="ltr">{request.email}</bdi></span>{request.priority ? <span className="staff-tag">{text.priority}</span> : null}</th>
        <td><span className={`staff-status staff-status--${request.status}`}>{text.statuses[request.status]}</span>{request.confirmation ? <span className="staff-muted staff-offer-ends">{confirmation[request.confirmation.state]} · {confirmation.deadline}: {formatStaffDate(request.confirmation.deadline, locale, copy.unknown)}</span> : null}{request.status === "offered" && request.offerExpiresAt ? <span className="staff-muted staff-offer-ends">{text.offerEnds}: {formatStaffDate(request.offerExpiresAt, locale, copy.unknown)}</span> : null}</td>
        <td data-testid="queue-ticket"><span className={`staff-status${request.ticketStatus === "issued" ? " staff-status--approved" : request.ticketStatus === "revoked" ? " staff-status--cancelled" : ""}`}>{request.ticketStatus ? text.ticketStatuses[request.ticketStatus] : text.ticketStatuses.none}</span></td>
        <td>{formatStaffDate(request.createdAt, locale, copy.unknown)}</td>
        <td className="staff-nowrap"><bdi dir="ltr">{request.identityMasked ?? "—"}</bdi></td>
        <td><div className="staff-actions">
          {decidable.has(request.status) ? <Button size="small" disabled={busy || !capacitySet} onClick={() => void decide("registration-approve", [request.id])}>{text.approve}</Button> : null}
          {request.status === "waitlisted" ? <Button size="small" variant="secondary" disabled={busy || !capacitySet} onClick={() => void decide("registration-offer", [request.id])}>{text.offer}</Button> : null}
          {request.status === "pending_approval" ? <Button size="small" variant="secondary" disabled={busy} onClick={() => void decide("registration-waitlist", [request.id])}>{text.waitlist}</Button> : null}
          <Button size="small" variant="ghost" disabled={busy} aria-label={`${text.details}: ${request.name}`} onClick={() => void openDetail(request.id)}>{text.details}</Button>
        </div></td>
      </tr>)}</tbody></table>
    </div>
    {!requests.length ? <p>{counts ? copy.noRecords : text.closedNote}</p> : null}
    {detail ? <section className="staff-detail" aria-labelledby="staff-detail-title" data-testid="queue-detail">
      <div className="staff-detail-head"><h3 id="staff-detail-title" ref={detailHeading} tabIndex={-1}>{text.detailTitle}: <bdi>{detail.request.name}</bdi></h3>
        <Button size="small" variant="secondary" onClick={() => setDetail(null)}>{text.closeDetails}</Button></div>
      <dl className="staff-detail-facts">
        <div><dt>{copy.status}</dt><dd>{text.statuses[detail.request.status]}</dd></div>
        <div><dt>{text.ticket}</dt><dd data-testid="detail-ticket">{detail.request.ticketStatus ? text.ticketStatuses[detail.request.ticketStatus] : text.ticketStatuses.none}</dd></div>
        <div><dt>{text.submitted}</dt><dd>{formatStaffDate(detail.request.createdAt, locale, copy.unknown)}</dd></div>
        <div><dt>{copy.identifier}</dt><dd>{detail.identity ? <>{registrationCopy[locale][detail.identity.documentType === "national_id" ? "nationalId" : detail.identity.documentType === "iqama" ? "iqama" : "passport"]}: <bdi dir="ltr">{detail.identity.documentNumber}</bdi></> : locale === "ar" ? "غير مقدّم" : "Not provided"}</dd></div>
        {detail.request.confirmation ? <div><dt>{confirmation.title}</dt><dd>{confirmation[detail.request.confirmation.state]} · {formatStaffDate(detail.request.confirmation.deadline, locale, copy.unknown)}</dd></div> : null}
        {detail.request.offerExpiresAt ? <div><dt>{text.offerEnds}</dt><dd>{formatStaffDate(detail.request.offerExpiresAt, locale, copy.unknown)}</dd></div> : null}
      </dl>
      <h4>{text.history}</h4>
      {detail.history.length ? <ol className="staff-decisions">{detail.history.map((row) => <li key={row.id} data-event={row.event}>
        <span>{row.event === "request.offered" && row.actorKind === "automatic" ? text.automaticOffer : text.events[row.event]}</span>
        {row.from && row.to ? <span className="staff-muted">{text.statuses[row.from]} {locale === "ar" ? "←" : "→"} {text.statuses[row.to]}</span> : null}
        <span className="staff-muted">{formatStaffDate(row.at, locale, copy.unknown)} · {text.by}: <bdi>{row.actorKind === "participant" ? text.participant : row.actorKind === "automatic" ? text.automatic : row.performerName ?? text.staff}</bdi></span>
      </li>)}</ol> : <p>{text.noHistory}</p>}
    </section> : null}
  </section>;
}
export type { Filter as RegistrationFilter };
