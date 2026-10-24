"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { decodeWinnerSupervisor, type ResearchParticipantEntry, type ResearchParticipantResponse, type WinnerSupervisor } from "./participant-contracts";
import { researchParticipantCopy } from "./participant-copy";
import "./participant.css";

export function ResearchParticipantWorkspace({ locale, initial }: { locale: Locale; initial?: ResearchParticipantResponse }) {
  const copy = researchParticipantCopy[locale], [result, setResult] = useState<ResearchParticipantResponse>(initial ?? { state: "denied" });
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const mounted = useRef(true), busy = useRef(false), operation = useRef<{ payload: string; id: string } | null>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/research-event?locale=" + locale, { credentials: "same-origin", cache: "no-store" });
      const next = await response.json() as ResearchParticipantResponse;
      if (mounted.current) setResult(next);
    } catch { if (mounted.current) setMessage(copy.unavailable); }
  }, [copy.unavailable, locale]);
  useEffect(() => { mounted.current = true; if (!initial || initial.state === "denied") queueMicrotask(() => { if (mounted.current) void refresh(); }); return () => { mounted.current = false; }; }, [initial, refresh]);
  async function save(awardId: string, details: WinnerSupervisor) {
    if (busy.current || result.state !== "ready") return;
    if (!decodeWinnerSupervisor(details) || !details.confirmed) { setMessage(copy.invalid); return; }
    busy.current = true; setPending(true); setMessage("");
    const payload = { action: "supervisor", awardId, details }, fingerprint = JSON.stringify(payload);
    if (operation.current?.payload !== fingerprint) operation.current = { payload: fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/research-event?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, operationId: operation.current.id, formToken: result.formToken }) });
      const next = await response.json() as ResearchParticipantResponse;
      if (!mounted.current) return;
      if (next.state === "ready") {
        if (next.outcome === "saved") { setResult(next); setMessage(copy.saved); operation.current = null; }
        else setMessage(next.outcome === "conflict" ? copy.conflict : next.outcome === "locked" ? copy.locked : copy.invalid);
      } else setMessage(next.state === "limited" ? copy.limited : next.state === "area-not-ready" ? copy.notReady : next.state === "closed" ? copy.closed : next.state === "invalid_input" ? copy.invalid : copy.unavailable);
    } catch { if (mounted.current) setMessage(copy.unavailable); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  return <section className="research-participant" data-testid="research-participant" aria-labelledby="research-participant-heading" dir={locale === "ar" ? "rtl" : "ltr"}>
    <h2 id="research-participant-heading">{copy.title}</h2>
    <p role="status" aria-live="polite">{message}</p>
    {result.state !== "ready" ? <div className="participant-account-card"><p role="status">{result.state === "closed" ? copy.closed : result.state === "denied" ? copy.denied : result.state === "area-not-ready" ? copy.notReady : copy.unavailable}</p>
      {result.state === "denied" ? <ButtonLink href={`/${locale}/sign-in`}>{locale === "ar" ? "تسجيل الدخول" : "Sign in"}</ButtonLink> : null}
    </div> : result.entries.length ? <div className="research-participant-list">{result.entries.map((entry) => <article key={entry.id} className="participant-account-card">
      <h3 lang="en" dir="ltr">{entry.title}</h3>{entry.reference ? <p><bdi>{entry.reference}</bdi></p> : null}
      {entry.presentationFormat ? <dl className="participant-account-profile"><div><dt>{copy.format}</dt><dd>{copy[entry.presentationFormat]}</dd></div></dl> : <p>{copy.unpublished}</p>}
      {entry.award ? <dl className="participant-account-profile" data-testid="research-published-award"><div><dt>{copy.award}</dt><dd><bdi>{entry.award.label}</bdi></dd></div></dl> : null}
      {entry.supervisorRequest ? <SupervisorForm key={entry.supervisorRequest.awardId + JSON.stringify(entry.supervisorRequest.details)} locale={locale} entry={entry} pending={pending} onSave={save} /> : null}
    </article>)}</div> : <p>{copy.empty}</p>}
    <div className="participant-account-actions"><Button variant="secondary" disabled={pending} onClick={() => void refresh()}>{copy.refresh}</Button></div>
  </section>;
}

function SupervisorForm({ locale, entry, pending, onSave }: { locale: Locale; entry: ResearchParticipantEntry; pending: boolean; onSave: (awardId: string, details: WinnerSupervisor) => Promise<void> }) {
  const copy = researchParticipantCopy[locale], request = entry.supervisorRequest!;
  const [details, setDetails] = useState<WinnerSupervisor>(request.details ?? { name: "", affiliation: "", email: "", confirmed: false });
  const deadline = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(request.deadline));
  return <form className="research-supervisor-form" onSubmit={(event) => { event.preventDefault(); void onSave(request.awardId, details); }}>
    <h4>{copy.supervisor}</h4><p>{copy.supervisorNote}</p><p className="research-supervisor-evidence">{request.evidence}</p><p>{copy.deadline}: <time dateTime={request.deadline}>{deadline}</time></p>
    <fieldset className="participant-account-fields" disabled={pending}>
      <legend className="sr-only">{copy.supervisor}</legend>
      <label className="field-label">{copy.name}<input className="field-input" required maxLength={500} value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} /></label>
      <label className="field-label">{copy.affiliation}<input className="field-input" required maxLength={500} value={details.affiliation} onChange={(event) => setDetails({ ...details, affiliation: event.target.value })} /></label>
      <label className="field-label">{copy.email}<input className="field-input" type="email" dir="ltr" required maxLength={254} value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} /></label>
      <label className="choice-label"><input type="checkbox" required checked={details.confirmed} onChange={(event) => setDetails({ ...details, confirmed: event.target.checked })} /><span>{copy.confirmation}</span></label>
    </fieldset>
    <div className="participant-account-actions"><Button type="submit" disabled={pending}>{copy.submit}</Button></div>
  </form>;
}
