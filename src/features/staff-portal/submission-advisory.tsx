"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { ABSTRACT_RUBRIC } from "./abstract-rubric";
import { screeningCopy } from "./screening-copy";
import type { AdvisoryRecord, AdvisoryResponse } from "./advisory-contract";
import { requestAdvisory } from "./advisory-client";

import { submissionAdvisoryCopy } from "./submission-advisory-copy";
function StaffCriterion({ locale, record, item, token, onResponse }: { locale: Locale; record: AdvisoryRecord; item: AdvisoryRecord["scores"][number]; token?: string; onResponse: (r: AdvisoryResponse) => void }) {
  const t = submissionAdvisoryCopy[locale], [score, setScore] = useState(String(item.value)), [note, setNote] = useState(item.rationale), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  return <form onSubmit={async e => { e.preventDefault(); if (busy || !token) return; setBusy(true); const r = await requestAdvisory({ action: "confirm-item", advisoryId: record.id, item: item.criterionId, score: Number(score), note, operationId: crypto.randomUUID(), formToken: token }); onResponse(r); setMessage(r.state === "updated" ? t.confirmed : t.unavailable); setBusy(false); }}>
    <fieldset className="staff-research-fields" disabled={busy}><legend>{screeningCopy[locale].criteria[item.criterionId as typeof ABSTRACT_RUBRIC[number]["id"]]}</legend><p lang="en" dir="ltr">{item.value}/4 · {item.rationale}</p>
      <label className="field">{t.score}<select className="field-input" value={score} onChange={e => setScore(e.target.value)}>{[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <label className="field">{t.note}<textarea className="field-input" lang="en" dir="ltr" required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <Button type="submit" variant="secondary" size="small" disabled={!token}>{t.confirm}</Button><p role="status">{message}</p>
    </fieldset>
  </form>;
}
export function SubmissionAdvisory({ locale, submissionId, onCopy, onToken }: { locale: Locale; submissionId: string; onCopy: (id: string, gate: number, observation: string) => void; onToken: (token: string) => void }) {
  const t = submissionAdvisoryCopy[locale], [data, setData] = useState<AdvisoryResponse | null>(null);
  useEffect(() => { const c = new AbortController(); void requestAdvisory(undefined, { area: "submission", submissionId, signal: c.signal }).then(r => { if (!c.signal.aborted) { setData(r); if (r.formToken) onToken(r.formToken); } }); return () => c.abort(); }, [submissionId, onToken]);
  const record = data?.advisory, enabled = data?.enabled === true && data?.runtimeReady === true;
  return <section className="staff-research-section" aria-label={t.label} data-testid="submission-advisory" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    <h5>{t.label}</h5><p role="status">{data?.state !== "ready" ? t.unavailable : !enabled ? t.disabled : record ? t.independent : t.pending}</p>
    {data?.notification ? <p>{t.notification}: <strong>{t.states[data.notification as keyof typeof t.states]}</strong></p> : null}
    {enabled && record?.gates ? <><p>{t.total}: <bdi>{record.total}/100</bdi></p><p>{t.source}: <bdi>{record.id}</bdi></p>
      <ul>{record.gates.map(g => <li key={g.gate}><strong>G{g.gate}</strong><p lang="en" dir="ltr">{g.observation}</p><Button variant="secondary" size="small" onClick={() => onCopy(record.id, g.gate, g.observation)}>{t.copy} G{g.gate}</Button></li>)}</ul>
      {record.scores.map(item => <StaffCriterion key={item.criterionId} locale={locale} record={record} item={item} token={data.formToken} onResponse={r => { setData(d => d ? { ...d, formToken: r.formToken ?? d.formToken } : d); if (r.formToken) onToken(r.formToken); }} />)}
    </> : null}
    {data?.confirmations?.length ? <details><summary>{t.confirmed}</summary><ul>{data.confirmations.map((c,i) => <li key={i}><bdi>{c.item}</bdi> · AI-assisted · {t.actor}: <bdi>{c.actorId}</bdi> · {t.source}: <bdi>{c.advisoryId}</bdi><time dateTime={c.at}> · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(c.at))}</time></li>)}</ul></details> : null}
  </section>;
}
