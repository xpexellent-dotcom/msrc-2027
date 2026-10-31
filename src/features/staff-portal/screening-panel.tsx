"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { ABSTRACT_RUBRIC, SUGGESTED_ABSTRACT_BANDS, type DecisionBands, type RecommendedBand } from "./abstract-rubric";
import type { ResearchPayload, ResearchResponse, ResearchReviewSummary } from "./research-contract";
import type { ScreeningInput, ScreeningReview, ScreeningSettings } from "./screening-contract";
import { screeningCopy } from "./screening-copy";
import { ABSTRACT_SPECIALTIES } from "@/content/abstract-taxonomy";

type Act = (payload: ResearchPayload, success?: string) => Promise<ResearchResponse>;
export function RecommendedAbstractBand({ locale, band }: { locale: Locale; band?: RecommendedBand }) {
  const t = screeningCopy[locale];
  return <span className="staff-screening-band"><strong>{t.bands[band ?? "settings_unset"]}</strong><small>{t.provisional}</small></span>;
}
export function FixedAbstractRubric({ locale }: { locale: Locale }) {
  const t = screeningCopy[locale];
  return <section aria-label={t.fixedRubric}><h4>{t.fixedRubric}</h4><p>{t.formula}</p><dl className="staff-screening-rubric">{ABSTRACT_RUBRIC.map((r) => <div key={r.id}><dt>{t.criteria[r.id]}</dt><dd>{r.weight}%</dd></div>)}</dl></section>;
}
export function ScreeningSettingsEditor({ locale, initial, admin, busy, act, onSaved }: { locale: Locale; initial: ScreeningSettings; admin: boolean; busy: boolean; act: Act; onSaved: () => void }) {
  const t = screeningCopy[locale], [useBands, setUseBands] = useState(initial.bands !== null);
  const [bands, setBands] = useState<Record<keyof DecisionBands, string>>({ oralMin: initial.bands ? String(initial.bands.oralMin) : "", posterMin: initial.bands ? String(initial.bands.posterMin) : "", borderlineMin: initial.bands ? String(initial.bands.borderlineMin) : "", acceptanceMin: initial.bands ? String(initial.bands.acceptanceMin) : "" });
  const [threshold, setThreshold] = useState(initial.similarityThreshold === null ? "" : String(initial.similarityThreshold)), [capacity, setCapacity] = useState(initial.oralCapacity === null ? "" : String(initial.oralCapacity));
  return <details className="staff-panel staff-screening-settings"><summary>{t.settings}</summary><p className="staff-note">{t.provisional}</p><p>{t.settingsHint}</p><p>{t.suggestions}</p><FixedAbstractRubric locale={locale} />
    <form onSubmit={(e) => { e.preventDefault(); void act({ action: "save-screening-settings", settings: { version: initial.version, similarityThreshold: threshold === "" ? null : Number(threshold), oralCapacity: capacity === "" ? null : Number(capacity), bands: useBands ? Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, Number(v)])) as DecisionBands : null } }).then((r) => { if (r.state === "ready") onSaved(); }); }}>
      <fieldset disabled={!admin || busy} className="staff-research-fields"><legend>{t.settings}</legend><div className="staff-research-grid">
        <label className="field">{t.threshold}<input className="field-input" type="number" min="0" max="100" step="any" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></label>
        <label className="field">{t.capacity}<input className="field-input" type="number" min="0" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label></div><p>{t.capacityHint}</p>
        <label className="staff-research-check"><input type="checkbox" checked={useBands} onChange={(e) => setUseBands(e.target.checked)} />{t.useBands}</label>
        {useBands ? <><Button type="button" variant="secondary" size="small" onClick={() => setBands((b) => ({ ...b, ...Object.fromEntries(Object.entries(SUGGESTED_ABSTRACT_BANDS).map(([k, v]) => [k, String(v)])) }))}>{t.applySuggestions}</Button><div className="staff-research-grid">{(["oralMin", "posterMin", "borderlineMin", "acceptanceMin"] as const).map((key) => <label className="field" key={key}>{t[key]}<input className="field-input" type="number" min="0" max="100" step="any" required value={bands[key]} onChange={(e) => setBands((b) => ({ ...b, [key]: e.target.value }))} /></label>)}</div></> : null}
        {admin ? <Button type="submit">{t.saveSettings}</Button> : null}
      </fieldset>
    </form>
  </details>;
}
export function ScreeningChecklist({ locale, review, submissionId, version, busy, act, onChanged }: { locale: Locale; review: ScreeningReview; submissionId: string; version: number; busy: boolean; act: Act; onChanged: () => void }) {
  const t = screeningCopy[locale], prior = (gate: number) => review.gates.find((g) => g.gate === gate);
  const [input, setInput] = useState<ScreeningInput>(() => ({ ethics: { passed: prior(5)?.passed ?? null, note: review.ethicsNote }, relevance: { passed: prior(6)?.passed ?? null, note: prior(6)?.note ?? "" }, externalChecked: review.externalChecked, externalReference: review.externalReference, similarityNote: "", failureDisposition: null, note: "", investigation: review.investigation, investigationNote: review.investigationNote }));
  const [operationId, setOperationId] = useState<string | null>(null);
  const update = <K extends keyof ScreeningInput>(key: K, value: ScreeningInput[K]) => { setInput((i) => ({ ...i, [key]: value })); setOperationId(null); };
  const allAutomatic = review.automatic.every((g) => g.passed === true), internalPass = review.similarityThreshold !== null && (review.matches[0]?.score ?? 0) < review.similarityThreshold;
  const willPass = allAutomatic && input.ethics.passed === true && input.relevance.passed === true && internalPass && input.externalChecked && !input.investigation;
  const specialty = ABSTRACT_SPECIALTIES.find((s) => s.id === review.specialty);
  const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  return <section className="staff-research-section staff-screening" aria-label={t.title} data-testid="abstract-screening"><h4>{t.title}</h4><p className="staff-note" role="status" data-testid="screening-status">{t.statuses[review.status]}</p>{review.status === "passed" && !review.current ? <p role="status">{t.stale}</p> : null}<p>{t.confidentiality}</p>
    <ol className="staff-screening-gates">{t.gates.map((label, i) => { const g = review.gates.find((g) => g.gate === i + 1), auto = review.automatic.find((g) => g.gate === i + 1); return <li key={i}><strong>G{i + 1}: {label}</strong><span>{g ? g.passed === null ? t.pending : g.passed ? t.pass : t.fail : t.pending}</span>{auto ? <small>{t.automatic}: {auto.passed ? t.pass : t.fail}</small> : null}</li>; })}</ol>
    <p>{t.specialty}: <bdi lang="en" dir="ltr">{specialty?.en ?? review.specialty}</bdi></p>
    <form onSubmit={(e) => { e.preventDefault(); const operation = operationId ?? crypto.randomUUID(); setOperationId(operation); void act({ action: "confirm-screening", submissionId, version, sequence: review.sequence, operationId: operation, screening: input }).then((r) => { if (r.state === "updated") onChanged(); }); }}>
      <fieldset disabled={busy} className="staff-research-fields"><legend>{t.staff}</legend>
        {(["ethics", "relevance"] as const).map((key) => <div key={key} className="staff-research-grid"><label className="field">{t[key]}<select aria-label={t[key]} className="field-input" value={input[key].passed === null ? "" : String(input[key].passed)} onChange={(e) => update(key, { ...input[key], passed: e.target.value === "" ? null : e.target.value === "true" })}><option value="">{t.pending}</option><option value="true">{t.pass}</option><option value="false">{t.fail}</option></select></label><label className="field">G{key === "ethics" ? 5 : 6}: {t.note}<textarea aria-label={`G${key === "ethics" ? 5 : 6}: ${t.note}`} className="field-input" rows={2} maxLength={3000} required={input[key].passed !== null} value={input[key].note} onChange={(e) => update(key, { ...input[key], note: e.target.value })} /></label></div>)}
        <p>{t.externalHint}</p>{review.similarityThreshold === null ? <p className="staff-note">{t.thresholdUnset}</p> : <p>{t.threshold}: {number(review.similarityThreshold)}%</p>}
        <label className="staff-research-check"><input type="checkbox" checked={input.externalChecked} onChange={(e) => update("externalChecked", e.target.checked)} />{t.external}</label>
        <label className="field">{t.externalReference}<input className="field-input" maxLength={1000} required={input.externalChecked} value={input.externalReference} onChange={(e) => update("externalReference", e.target.value)} /></label>
        <label className="field">{t.similarityNote}<textarea aria-label={t.similarityNote} className="field-input" rows={2} maxLength={3000} value={input.similarityNote} onChange={(e) => update("similarityNote", e.target.value)} /></label>
        <label className="staff-research-check"><input type="checkbox" checked={input.investigation} onChange={(e) => update("investigation", e.target.checked)} />{t.investigation}</label><p>{t.investigationHint}</p>
        <label className="field">{t.investigationNote}<textarea aria-label={t.investigationNote} className="field-input" rows={2} maxLength={3000} required={input.investigation || review.investigation} value={input.investigationNote} onChange={(e) => update("investigationNote", e.target.value)} /></label>
        <label className="field">{t.failureDisposition}<select aria-label={t.failureDisposition} className="field-input" value={input.failureDisposition ?? ""} onChange={(e) => update("failureDisposition", (e.target.value || null) as ScreeningInput["failureDisposition"])}><option value="">{t.choose}</option><option value="correctable">{t.correctable}</option><option value="final">{t.final}</option></select></label>
        <label className="field">{t.rationale}<textarea aria-label={t.rationale} className="field-input" rows={2} maxLength={3000} required={input.failureDisposition !== null} value={input.note} onChange={(e) => update("note", e.target.value)} /></label>
        <Button type="submit">{willPass ? t.confirm : t.record}</Button>
      </fieldset>
    </form>
    <h5>{t.matches}</h5><p>{t.corpus}</p>{review.matches.length ? <ol className="staff-screening-matches">{review.matches.map((m) => <li key={m.id}><bdi>{m.reference ?? m.id}</bdi> · <span>{number(m.score)}%</span><p lang="en" dir="ltr">{m.title}</p><small><bdi>{m.edition}</bdi> · {number(m.version)}</small></li>)}</ol> : <p>{t.noMatches}</p>}
    <details><summary>{t.history}</summary>{review.history.map((h) => <article key={h.sequence}><h5>{number(h.sequence)} · {t.statuses[h.status]}</h5><p>{t.recordedBy}: <bdi>{h.actorId}</bdi> · <time dateTime={h.at}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(h.at))}</time></p><p>{h.note}</p><ul>{h.gates.map((g) => <li key={g.gate}>G{g.gate}: {g.passed === null ? t.pending : g.passed ? t.pass : t.fail}<p dir="auto">{g.note}</p></li>)}</ul></article>)}</details>
  </section>;
}
export function CriterionDisagreement({ locale, summary }: { locale: Locale; summary: ResearchReviewSummary }) {
  const t = screeningCopy[locale]; if (summary.reviews.length < 2) return null;
  return <section className="staff-research-section" aria-label={t.disagreement}><h5>{t.disagreement}</h5><dl className="staff-screening-rubric">{ABSTRACT_RUBRIC.map((r) => { const scores = summary.reviews.flatMap((v) => v.scorecard.scores.filter((s) => s.criterionId === r.id).map((s) => s.value)); return <div key={r.id}><dt>{t.criteria[r.id]}</dt><dd>{scores.length === summary.reviews.length ? Math.max(...scores) - Math.min(...scores) : "—"}</dd></div>; })}</dl></section>;
}
export function AdditionalAbstractReview({ locale, submissionId, summary, busy, act, onChanged }: { locale: Locale; submissionId: string; summary: ResearchReviewSummary; busy: boolean; act: Act; onChanged: () => void }) {
  const t = screeningCopy[locale], [required, setRequired] = useState(""), [note, setNote] = useState("");
  const [operation, setOperation] = useState<string | null>(null), current = summary.requiredReviews ?? 2;
  if (current >= 5) return null;
  return <details className="staff-research-section"><summary>{t.additional}</summary><p>{t.additionalPolicy}</p><form onSubmit={(e) => { e.preventDefault(); const operationId = operation ?? crypto.randomUUID(); setOperation(operationId); void act({ action: "request-additional-review", submissionId, expectedRequired: current, requiredReviews: Number(required), note, operationId }).then((r) => { if (r.state === "updated") onChanged(); }); }}>
    <fieldset disabled={busy} className="staff-research-fields"><legend className="sr-only">{t.additional}</legend><label className="field">{t.requiredReviews}<input className="field-input" type="number" min={current + 1} max="5" step="1" required value={required} onChange={(e) => { setRequired(e.target.value); setOperation(null); }} /></label><label className="field">{t.additionalNote}<textarea aria-label={t.additionalNote} className="field-input" rows={2} maxLength={3000} required value={note} onChange={(e) => { setNote(e.target.value); setOperation(null); }} /></label><Button type="submit">{t.additional}</Button></fieldset>
  </form></details>;
}
