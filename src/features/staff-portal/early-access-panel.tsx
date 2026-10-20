"use client";

import { useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { staffCopy } from "./copy";
import { consoleCopy } from "./console-copy";
import { formatStaffDate, formatStaffNumber } from "./console-shell";
import type { StaffPayload, StaffResponse } from "./ui-contract";

/** Splits pasted text on new lines, commas, semicolons and spaces; the server validates and normalizes. */
export function parseEarlyAccessEmails(value: string) {
  return [...new Set(value.split(/[\s,;]+/).map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
}

/** ORG-056: Super Admin-only early-access list. Eligibility is enforced by the database at request time. */
export function EarlyAccessPanel({ locale, data, busy, query, onQuery, onSearch, act, onResult }: {
  locale: Locale; data?: StaffResponse["earlyAccess"]; busy: boolean; query: string; onQuery: (value: string) => void; onSearch: () => void;
  act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>; onResult: (text: string) => void;
}) {
  const copy = staffCopy[locale], text = consoleCopy[locale].earlyAccess;
  const [pasted, setPasted] = useState(""), [invalid, setInvalid] = useState<string[]>([]), [selected, setSelected] = useState<string[]>([]);
  const emails = parseEarlyAccessEmails(pasted), entries = data?.entries ?? [];
  const number = (value: number) => formatStaffNumber(value, locale);

  async function add() {
    if (!emails.length) { onResult(text.noneEntered); return; }
    const response = await act({ action: "early-access-add", emails });
    if (response.state !== "updated") return;
    const rejected = response.invalid ?? [];
    setInvalid(rejected); setPasted(rejected.join("\n"));
    onResult(text.added(emails.length - rejected.length, rejected.length));
  }
  async function remove(ids: string[]) {
    if (!ids.length) { onResult(text.noneSelected); return; }
    const response = await act({ action: "early-access-remove", entryIds: ids });
    if (response.state === "updated") { setSelected([]); onResult(text.removed(ids.length)); }
  }

  return <>
    <section className="staff-panel" aria-labelledby="staff-early-title">
      <h2 id="staff-early-title">{copy.areas["early-access"]}</h2>
      <p>{text.intro}</p>
      <form className="staff-early-form" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <label className="field" htmlFor="staff-early-emails"><span className="field-label">{text.paste}</span>
          <span className="field-hint" id="staff-early-hint">{text.pasteHint}</span>
          <textarea id="staff-early-emails" className="field-input staff-early-input" dir="ltr" rows={6} value={pasted} disabled={busy}
            aria-describedby="staff-early-hint" aria-invalid={invalid.length > 0 || undefined} onChange={(event) => { setPasted(event.target.value); setInvalid([]); }} />
        </label>
        {invalid.length ? <p className="staff-note" role="note">{text.invalid(invalid.length)}</p> : null}
        <div className="staff-actions"><Button type="submit" disabled={busy || !emails.length} data-testid="early-add">{text.add(emails.length)}</Button></div>
      </form>
    </section>
    <section className="staff-panel" aria-labelledby="staff-early-list">
      <h2 id="staff-early-list">{text.list}{data ? ` (${number(entries.length)})` : ""}</h2>
      <form className="staff-search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <FormField id="staff-early-search" type="search" label={text.search} value={query} onChange={(event) => onQuery(event.target.value)} maxLength={120} disabled={busy} />
        <Button type="submit" disabled={busy}>{copy.search}</Button>
      </form>
      {selected.length ? <div className="staff-bulk-bar" role="region" aria-label={text.selected(selected.length)}>
        <span aria-live="polite">{text.selected(selected.length)}</span>
        <Button size="small" variant="secondary" disabled={busy} onClick={() => void remove(selected)} data-testid="early-remove-selected">{text.removeSelected}</Button>
      </div> : null}
      {entries.length ? <div className="staff-table-scroll" role="region" aria-label={text.list} tabIndex={0}>
        <table><thead><tr>
          <th scope="col"><label className="staff-check"><input type="checkbox" disabled={busy} checked={entries.every((entry) => selected.includes(entry.id))}
            onChange={(event) => setSelected(event.target.checked ? entries.map((entry) => entry.id) : [])} /><span className="sr-only">{text.selectAll}</span></label></th>
          <th scope="col">{text.email}</th><th scope="col">{text.account}</th><th scope="col">{text.request}</th><th scope="col" className="staff-nowrap">{text.addedOn}</th><th scope="col">{copy.action}</th>
        </tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} data-testid="early-row">
          <td><label className="staff-check"><input type="checkbox" disabled={busy} checked={selected.includes(entry.id)}
            onChange={(event) => setSelected((current) => event.target.checked ? [...current, entry.id] : current.filter((id) => id !== entry.id))} /><span className="sr-only">{text.select} {entry.email}</span></label></td>
          <th scope="row"><bdi dir="ltr">{entry.email}</bdi></th>
          <td><span className={entry.hasAccount ? "staff-status staff-status--approved" : "staff-status"}>{entry.hasAccount ? text.hasAccount : text.noAccount}</span></td>
          <td>{entry.hasRequest ? text.requested : "—"}</td>
          <td>{formatStaffDate(entry.addedAt, locale, copy.unknown)}{entry.addedByName ? <span className="staff-muted staff-offer-ends">{text.by}: <bdi>{entry.addedByName}</bdi></span> : null}</td>
          <td><Button size="small" variant="secondary" disabled={busy} aria-label={`${text.remove}: ${entry.email}`} onClick={() => void remove([entry.id])}>{text.remove}</Button></td>
        </tr>)}</tbody></table>
      </div> : <p>{data ? (query ? copy.noRecords : text.empty) : text.loading}</p>}
    </section>
  </>;
}
