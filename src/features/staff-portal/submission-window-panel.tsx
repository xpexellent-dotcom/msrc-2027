"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { PUBLISHED_WINDOW, riyadhToUtc, utcToRiyadh, validWindow, WINDOW_GATES, windowReadiness, type SubmissionWindow } from "../submissions/submission-window";
import type { ResearchPayload, ResearchResponse } from "./research-contract";

import { submissionWindowCopy } from "./submission-window-copy";

export function SubmissionWindowPanel({ locale, initial, admin, busy, act, onSaved, reload }: { locale: Locale; initial?: SubmissionWindow; admin: boolean; busy: boolean; act: (payload: ResearchPayload, success?: string) => Promise<ResearchResponse>; onSaved: () => void; reload: () => void }) {
  const text = submissionWindowCopy[locale], [opens, setOpens] = useState(utcToRiyadh(initial?.opensAt ?? null)), [closes, setCloses] = useState(utcToRiyadh(initial?.closesAt ?? null)), [enabled, setEnabled] = useState(initial?.enabled ?? false);
  // Re-observe at boundaries and on focus; no browser clock controls mutation authority.
  useEffect(() => {
    const dates = [initial?.opensAt, initial?.closesAt].filter((date): date is string => !!date).map(Date.parse).filter((date) => date > Date.now());
    const timer = dates.length ? window.setTimeout(reload, Math.min(Math.min(...dates) - Date.now() + 100, 2147483647)) : undefined;
    window.addEventListener("focus", reload);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", reload); };
  }, [initial?.opensAt, initial?.closesAt, initial?.observedAt, reload]);
  const opensAt = opens ? riyadhToUtc(opens) : null, closesAt = closes ? riyadhToUtc(closes) : null;
  const valid = (!opens || opensAt !== null) && (!closes || closesAt !== null) && validWindow(opensAt, closesAt) && (!enabled || opensAt !== null);
  const gates = initial ? windowReadiness(initial) : null;
  return <section className="staff-panel staff-research-settings staff-submission-window" data-testid="submission-window" dir={locale === "ar" ? "rtl" : "ltr"} aria-labelledby="submission-window-title">
    <h3 id="submission-window-title">{text.title}</h3><p>{text.hint}</p><p className="staff-note">{text.admin}</p>
    {!initial ? <p role="status">{text.missing}</p> : <>
      <form onSubmit={(event) => { event.preventDefault(); if (!valid) return; void act({ action: "save-window", version: initial.version, opensAt, closesAt, enabled }, text.saved).then((response) => { if (response.state === "ready") onSaved(); }); }}>
        <fieldset disabled={busy || !admin} className="staff-research-fields"><legend className="sr-only">{text.title}</legend>
          <div className="staff-research-grid">{([["window-opens", text.opens, opens, setOpens], ["window-closes", text.closes, closes, setCloses]] as const).map(([id, label, value, change]) => <div className="field" key={id}><label className="field-label" htmlFor={id}>{label}</label><input className="field-input" id={id} type="datetime-local" dir="ltr" value={value} onChange={(event) => change(event.target.value)} /></div>)}</div>
          <label><input type="checkbox" role="switch" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> {text.enabled}</label>
          <div className="staff-actions"><Button type="button" variant="secondary" onClick={() => { setOpens(utcToRiyadh(PUBLISHED_WINDOW.opensAt)); setCloses(utcToRiyadh(PUBLISHED_WINDOW.closesAt)); }}>{text.suggestion}</Button><Button type="submit" disabled={!valid}>{text.save}</Button></div>
        </fieldset>
      </form>
      <p>{text.utc}: <bdi className="staff-window-utc" dir="ltr"><time dateTime={initial.opensAt ?? undefined}>{initial.opensAt ?? "—"}</time><time dateTime={initial.closesAt ?? undefined}>{initial.closesAt ?? "—"}</time></bdi></p>
      <h4>{text.readiness}</h4><p>{text.observed}: <time className="staff-window-observed" dir="ltr" dateTime={initial.observedAt}>{utcToRiyadh(initial.observedAt)} Asia/Riyadh</time></p>
      <ul className="staff-window-gates">{WINDOW_GATES.map((key) => <li key={key} data-gate={key} data-ready={gates![key]}><strong>{text.gates[key][0]}: {gates![key] ? text.ready : text.blocked}</strong><p>{text.gates[key][gates![key] ? 1 : 2]}</p></li>)}</ul>
      <p role="status">{Object.values(gates!).every(Boolean) ? text.effective : text.closed}</p>
    </>}
  </section>;
}
