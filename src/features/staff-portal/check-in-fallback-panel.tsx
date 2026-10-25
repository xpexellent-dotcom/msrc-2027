"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { formatStaffNumber } from "./console-shell";
import { requestStaff } from "./staff-client";
import { checkInFallbackCopy } from "./check-in-fallback-copy";
import { parseOfflineSheet, type OfflineEntry, type OfflineImportResult } from "./check-in-fallback-contract";

type State = keyof typeof checkInFallbackCopy.en.states;
const states = new Set<string>(Object.keys(checkInFallbackCopy.en.states));

/** ENG-082 / CHK-05: the roster is downloaded, never stored by the page; results list row positions and outcomes only. */
export function CheckInFallbackPanel({ locale, day }: { locale: Locale; day: string }) {
  const text = checkInFallbackCopy[locale];
  const [sheet, setSheet] = useState(""), [entries, setEntries] = useState<OfflineEntry[] | null>(null);
  const [message, setMessage] = useState(""), [rosterMessage, setRosterMessage] = useState("");
  const [busy, setBusy] = useState<"" | "roster" | "import">(""), [result, setResult] = useState<OfflineImportResult | null>(null);
  // One batch ID per checked sheet, so a retry after a dropped response replays instead of duplicating work.
  const operation = useRef<string | null>(null);
  const failure = (state: string | undefined) => text.states[(state && states.has(state) ? state : "unavailable") as State];

  async function downloadRoster() {
    if (!day) { setRosterMessage(text.chooseDay); return; }
    setBusy("roster"); setRosterMessage("");
    try {
      const response = await fetch(`/api/staff-portal/check-in-fallback?${new URLSearchParams({ area: "roster", day })}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) {
        setRosterMessage(failure(((await response.json().catch(() => null)) as { state?: string } | null)?.state)); return;
      }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = `checkin-roster-${day}.csv`; link.click(); URL.revokeObjectURL(url);
      setRosterMessage(text.downloaded);
    } catch { setRosterMessage(text.states.unavailable); } finally { setBusy(""); }
  }

  function edit(value: string) { setSheet(value); setEntries(null); setResult(null); setMessage(""); operation.current = null; }
  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (file && file.size <= 512 * 1024) edit(await file.text()); else if (file) { edit(""); setMessage(text.tooMany); }
  }
  function check() {
    const parsed = parseOfflineSheet(sheet); setResult(null);
    if (parsed.state === "ready") { setEntries(parsed.entries); setMessage(text.ready(parsed.entries.length)); operation.current = crypto.randomUUID(); }
    else { setEntries(null); setMessage(parsed.state === "malformed" ? text.malformed(parsed.line) : parsed.state === "too_many" ? text.tooMany : text.empty); }
  }
  async function reconcile() {
    if (!entries || !operation.current) return;
    if (!day) { setMessage(text.chooseDay); return; }
    setBusy("import"); setMessage("");
    try {
      const admission = await requestStaff();
      if (admission.state !== "authenticated" || !admission.formToken) { setMessage(failure("denied")); return; }
      const response = await fetch("/api/staff-portal/check-in-fallback", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "offline-import", formToken: admission.formToken, day, operationId: operation.current, entries }) });
      const value = await response.json().catch(() => null) as { state?: string; result?: OfflineImportResult } | null;
      if (value?.state === "updated" && value.result) { setResult(value.result); if (value.result.state === "replayed") setMessage(text.replayed); }
      else setMessage(failure(value?.state));
    } catch { setMessage(text.states.unavailable); } finally { setBusy(""); }
  }

  const review = result?.outcomes.some((outcome) => outcome !== "checked_in" && outcome !== "already_checked_in");
  return <section className="staff-checkin-fallback" aria-labelledby="checkin-fallback-title" data-testid="checkin-fallback">
    <h2 id="checkin-fallback-title">{text.title}</h2>
    <p>{text.intro}</p>
    <div><h3>{text.rosterTitle}</h3><p>{text.rosterHint}</p>
      <Button variant="secondary" size="small" disabled={!!busy || !day} onClick={() => void downloadRoster()}>{busy === "roster" ? text.downloading : text.download}</Button>
      {rosterMessage ? <p role="status">{rosterMessage}</p> : null}
    </div>
    <div><h3>{text.importTitle}</h3><p>{text.importHint}</p>
      <div className="field"><label className="field-label" htmlFor="checkin-fallback-file">{text.file}</label><input className="field-input" id="checkin-fallback-file" type="file" accept=".csv,.txt,text/csv,text/plain" disabled={!!busy} onChange={(event) => void openFile(event)} /></div>
      <div className="field"><label className="field-label" htmlFor="checkin-fallback-sheet">{text.sheet}</label><p className="field-hint" id="checkin-fallback-sheet-hint">{text.sheetHint}</p>
        <textarea className="field-input" id="checkin-fallback-sheet" rows={6} dir="ltr" spellCheck={false} autoComplete="off" value={sheet} disabled={!!busy} aria-describedby="checkin-fallback-sheet-hint" onChange={(event) => edit(event.target.value)} /></div>
      <div className="staff-actions">
        <Button variant="secondary" size="small" disabled={!!busy || !sheet.trim()} onClick={check}>{text.check}</Button>
        <Button size="small" disabled={!!busy || !entries || !day} onClick={() => void reconcile()}>{busy === "import" ? text.reconciling : text.reconcile}</Button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </div>
    {result && entries ? <div data-testid="checkin-fallback-results"><h3>{text.resultsTitle}</h3>
      <dl className="staff-seat-bar">{Object.entries(result.counts).map(([outcome, count]) => <div key={outcome}><dt>{text.outcomes[outcome as keyof typeof text.outcomes]}</dt><dd>{formatStaffNumber(count ?? 0, locale)}</dd></div>)}</dl>
      {review ? <p role="status">{text.review}</p> : null}
      <div className="staff-table-scroll" role="region" tabIndex={0} aria-label={text.resultsTitle}><table className="staff-table"><thead><tr><th scope="col">{text.row}</th><th scope="col">{text.reference}</th><th scope="col">{text.outcome}</th></tr></thead>
        <tbody>{result.outcomes.map((outcome, index) => <tr key={index} data-outcome={outcome}><td>{formatStaffNumber(index + 1, locale)}</td><td dir="ltr"><bdi>{entries[index]?.reference}</bdi></td><td>{text.outcomes[outcome]}</td></tr>)}</tbody>
      </table></div>
    </div> : null}
  </section>;
}
