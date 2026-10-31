"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/permissions/contract";
import type { CalibrationSummary } from "@/lib/ai-assessment/calibration";
import type { AdvisoryPayload, AdvisoryRecord, AdvisoryResponse, AdvisorySettings } from "./advisory-contract";
import { advisoryEstimateWithinCap } from "./advisory-contract";
import { requestAdvisory } from "./advisory-client";
import { submissionAdvisoryCopy } from "./submission-advisory-copy";
import { advisoryCopy } from "./advisory-copy";

type Act = (payload: AdvisoryPayload, success: string) => Promise<AdvisoryResponse>;
const success = (state: string) => ["ready", "updated", "queued"].includes(state);
const numericKeys = ["maxPerRun", "maxPerDay", "estimatedCostPerAbstract", "dailyCostCap"] as const;
const evidenceKeys = ["noticeReference", "evaluationReference", "operatingReference"] as const;
const evidenceLabels = { noticeReference: "notice", evaluationReference: "evaluation", operatingReference: "operating" } as const;
function number(value: number, locale: Locale, maximumFractionDigits = 3) { return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { maximumFractionDigits }).format(value); }
function messageFor(state: string, locale: Locale) {
  const aliases: Record<string, string> = { invalid: "invalid-input", conflict: "operation-conflict", "settings-incomplete": "configuration-required", "packet-required": "not-ready", "stale-snapshot": "operation-conflict" };
  const errors = advisoryCopy[locale].errors, key = aliases[state] ?? state;
  return errors[key as keyof typeof errors] ?? errors.unavailable;
}

function AdvisorySettingsEditor({ locale, initial, version, superAdmin, busy, act, onSaved }: { locale: Locale; initial: AdvisorySettings; version: number; superAdmin: boolean; busy: boolean; act: Act; onSaved: () => void }) {
  const [draft, setDraft] = useState(initial), text = advisoryCopy[locale];
  const change = <K extends keyof AdvisorySettings>(key: K, value: AdvisorySettings[K]) => setDraft(current => ({ ...current, [key]: value }));
  const numeric = (key: typeof numericKeys[number] | "maxAttempts" | "maxTokens") => <div className="field" key={key}><label className="field-label" htmlFor={`advisory-${key}`}>{text[key]}</label><input className="field-input" id={`advisory-${key}`} type="number" min={key === "estimatedCostPerAbstract" || key === "dailyCostCap" ? "0.000001" : "1"} max={key === "maxAttempts" ? 5 : key === "maxTokens" ? 16384 : undefined} step={key === "estimatedCostPerAbstract" || key === "dailyCostCap" ? "any" : "1"} value={draft[key] ?? ""} onChange={event => change(key, event.target.value === "" ? null : Number(event.target.value))} dir="ltr" /></div>;
  return <details className="staff-panel staff-research-settings"><summary>{text.settings}</summary><p>{text.settingsHint}</p>
    <form onSubmit={event => { event.preventDefault(); void act({ action: "save-settings", version, settings: draft }, text.saved).then(response => { if (success(response.state)) onSaved(); }); }}>
      <fieldset className="staff-research-fields" disabled={busy}><legend className="sr-only">{text.settings}</legend><div className="staff-research-grid">{numericKeys.map(numeric)}<div className="field"><label className="field-label" htmlFor="advisory-currency">{text.currency}</label><input id="advisory-currency" className="field-input" dir="ltr" maxLength={3} pattern="[A-Z]{3}" value={draft.currency ?? ""} onChange={event => change("currency", event.target.value.toUpperCase() || null)} /></div></div><p className="staff-muted">{text.budgetHint}</p>
        {superAdmin ? <fieldset className="staff-research-collection"><legend>{text.database}</legend><div className="staff-research-grid">{evidenceKeys.map(key => <div className="field" key={key}><label className="field-label" htmlFor={`advisory-${key}`}>{text[evidenceLabels[key]]}</label><input id={`advisory-${key}`} className="field-input" maxLength={500} value={draft[key] ?? ""} onChange={event => change(key, event.target.value || null)} /></div>)}<div className="field"><label className="field-label" htmlFor="advisory-model">{text.model}</label><select id="advisory-model" className="field-input" value={draft.model ?? ""} onChange={event => change("model", event.target.value || null)}><option value="">{text.choose}</option><option value="deepseek-flash">deepseek-flash</option></select></div>{numeric("maxAttempts")}{numeric("maxTokens")}</div>
          <label className="staff-research-check"><input type="checkbox" checked={draft.enabled} onChange={event => change("enabled", event.target.checked)} /><span>{text.activate}</span></label>
          <label className="staff-research-check"><input type="checkbox" disabled checked={false} /><span>{text.reviewers}</span></label><p className="staff-muted">{text.anchoring}</p>
        </fieldset> : <p className="staff-note">{text.reviewers}: {initial.reviewerVisible ? text.enabled : text.disabled}. {text.anchoring}</p>}
        <Button type="submit">{text.save}</Button>
      </fieldset>
    </form>
  </details>;
}

export function AdvisoryRecordView({ locale, record }: { locale: Locale; record: AdvisoryRecord }) {
  const text = advisoryCopy[locale];
  return <article className="staff-advisory-record"><h4><bdi>{record.reference}</bdi></h4><p className="staff-advisory-label">{text.label}</p><p>{text.submissionVersion}: {number(record.submissionVersion, locale)} · {text.rubricVersion}: {number(record.rubricVersion, locale)}</p>
    <dl className="staff-advisory-scores">{record.scores.map(score => { const criterion = record.rubric.find(item => item.id === score.criterionId); return <div key={score.criterionId}><dt lang="en" dir="ltr">{criterion?.label ?? score.criterionId}</dt><dd><p><strong>{text.score}: {number(score.value, locale)}</strong>{criterion ? ` (${number(criterion.min, locale)}–${number(criterion.max, locale)})` : ""}</p><p className="staff-muted">{text.rationale}</p><p lang="en" dir="ltr" className="staff-research-comment">{score.rationale}</p></dd></div>; })}</dl>
  </article>;
}

function CalibrationView({ locale, data }: { locale: Locale; data: CalibrationSummary }) {
  const text = advisoryCopy[locale], metric = (value: number | null, percentage = false) => value === null ? text.unavailableMetric : number(value * (percentage ? 100 : 1), locale);
  return <section className="staff-panel" aria-label={text.calibration}><h3>{text.calibration}</h3><p>{text.calibrationHint}</p><p className="staff-muted">{text.calibrationScale}</p>{data.pairCount === 0 ? <p>{text.emptyCalibration}</p> : <>
    <dl className="staff-advisory-metrics"><div><dt>{text.paired}</dt><dd>{number(data.abstractCount, locale)}</dd></div><div><dt>{text.pairs}</dt><dd>{number(data.pairCount, locale)}</dd></div><div><dt>{text.correlation}</dt><dd>{metric(data.pearsonCorrelation)}</dd></div><div><dt>{text.agreement}</dt><dd>{metric(data.meanAbsoluteDifference, true)}</dd></div><div><dt>{text.signedDifference}</dt><dd>{metric(data.meanSignedDifference, true)}</dd></div><div><dt>{text.exactAgreement}</dt><dd>{data.exactAgreementRate === null ? text.unavailableMetric : `${metric(data.exactAgreementRate, true)}%`}</dd></div></dl>
    <div className="staff-table-scroll" role="region" tabIndex={0} aria-label={text.calibration}><table className="staff-table"><thead><tr><th scope="col">{text.criterion}</th><th scope="col">{text.rubricVersion}</th><th scope="col">{text.pairs}</th><th scope="col">{text.correlation}</th><th scope="col">{text.agreement}</th><th scope="col">{text.exactAgreement}</th></tr></thead><tbody>{data.criteria.map(item => <tr key={`${item.rubricVersion}-${item.criterionId}`}><th scope="row" dir="ltr" lang="en">{item.criterionId}</th><td>{number(item.rubricVersion, locale)}</td><td>{number(item.pairCount, locale)}</td><td>{metric(item.pearsonCorrelation)}</td><td>{metric(item.meanAbsoluteDifference, true)}</td><td>{item.exactAgreementRate === null ? text.unavailableMetric : `${metric(item.exactAgreementRate, true)}%`}</td></tr>)}</tbody></table></div>
  </>}</section>;
}

export function AdvisoryPanel({ locale, roles }: { locale: Locale; roles: readonly Role[] }) {
  const text = advisoryCopy[locale], [view, setView] = useState<"workspace" | "calibration">("workspace"), [data, setData] = useState<AdvisoryResponse | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failed, setFailed] = useState(false), [selected, setSelected] = useState<string[]>([]), [confirmed, setConfirmed] = useState(false);
  const active = useRef(true), token = useRef<string | undefined>(undefined), lock = useRef(false), pending = useRef(new Set<AbortController>()), feedback = useRef<HTMLParagraphElement>(null), operation = useRef<string | null>(null), readVersion = useRef(0);
  useEffect(() => { active.current = true; const requests = pending.current; return () => { active.current = false; for (const controller of requests) controller.abort(); }; }, []);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  const load = useCallback(async (preserveFeedback = false) => {
    // A fresh packet/settings snapshot requires a fresh selection and processing acknowledgement.
    setLoading(true); setSelected([]); setConfirmed(false); operation.current = null;
    if (!preserveFeedback) { setMessage(""); setFailed(false); }
    const version = ++readVersion.current, controller = new AbortController(); pending.current.add(controller);
    const response = await requestAdvisory(undefined, { area: view, signal: controller.signal }); pending.current.delete(controller);
    if (!active.current || controller.signal.aborted || version !== readVersion.current) return;
    if (response.formToken) token.current = response.formToken;
    setData(response); setLoading(false);
    if (response.state !== "ready") { setFailed(true); setMessage(messageFor(response.state, locale)); }
  }, [locale, view]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const act = useCallback<Act>(async (payload, notice) => {
    if (lock.current || !token.current) return { state: "unavailable" };
    lock.current = true; setBusy(true); setMessage(""); setFailed(false);
    const controller = new AbortController(); pending.current.add(controller);
    const response = await requestAdvisory({ ...payload, formToken: token.current }, { signal: controller.signal }); pending.current.delete(controller); lock.current = false;
    if (!active.current || controller.signal.aborted) return { state: "cancelled" };
    if (response.formToken) token.current = response.formToken;
    setBusy(false); setFailed(!success(response.state)); setMessage(success(response.state) ? notice : messageFor(response.state, locale)); return response;
  }, [locale]);
  const settings = data?.settings, enabled = data?.runtimeReady === true && settings?.enabled === true;
  const estimate = settings?.estimatedCostPerAbstract !== null && settings?.estimatedCostPerAbstract !== undefined && settings.maxAttempts !== null ? selected.length * settings.estimatedCostPerAbstract * settings.maxAttempts : null;
  const runWithinBudget = !!settings?.maxPerRun && !!settings.maxPerDay && estimate !== null && settings.dailyCostCap !== null && selected.length <= settings.maxPerRun && selected.length <= settings.maxPerDay && advisoryEstimateWithinCap(settings.estimatedCostPerAbstract!, selected.length * settings.maxAttempts!, settings.dailyCostCap);
  const choose = (id: string, checked: boolean) => { setSelected(current => checked ? [...current, id] : current.filter(value => value !== id)); setConfirmed(false); operation.current = null; };
  return <div className="staff-research-workspace staff-advisory-workspace" data-testid="advisory-workspace" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    <p>{text.description}</p><aside className="staff-note" aria-label={text.label}><strong>{text.label}</strong><p>{text.prc}</p><p>{text.minimization}</p><p>{text.gate}</p></aside>
    <div className="staff-actions"><Button variant="secondary" aria-pressed={view === "workspace"} disabled={busy} onClick={() => { if (view !== "workspace") { setData(null); setLoading(true); setMessage(""); setView("workspace"); } }}>{text.scoring}</Button><Button variant="secondary" aria-pressed={view === "calibration"} disabled={busy} onClick={() => { if (view !== "calibration") { setData(null); setLoading(true); setMessage(""); setView("calibration"); } }}>{text.calibration}</Button></div>
    <p ref={feedback} tabIndex={-1} role={failed ? "alert" : "status"} className={message ? "staff-feedback" : "staff-feedback staff-feedback--empty"}>{busy ? text.loading : message}</p>
    {loading ? <p role="status">{text.loading}</p> : data?.state !== "ready" ? <Button variant="secondary" onClick={() => void load()}>{text.retry}</Button> : view === "calibration" ? data.calibration ? <CalibrationView locale={locale} data={data.calibration} /> : <p>{text.emptyCalibration}</p> : settings ? <>
      <p className="staff-note" role="status">{!enabled ? submissionAdvisoryCopy[locale].disabled : text.label}</p>
      <p className="staff-note">{text.runtime}: <strong>{data.runtimeReady ? text.enabled : text.disabled}</strong> · {text.database}: <strong>{settings.enabled ? text.enabled : text.disabled}</strong></p>
      <AdvisorySettingsEditor key={data.version} locale={locale} initial={settings} version={data.version ?? 0} superAdmin={roles.includes("superAdmin")} busy={busy} act={act} onSaved={() => void load(true)} />
      <section className="staff-panel" aria-label={text.candidates}><div className="staff-detail-head"><h3>{text.candidates}</h3><Button variant="secondary" size="small" disabled={busy} onClick={() => void load()}>{text.refresh}</Button></div><p>{text.runHint}</p>{!data.candidates?.length ? <p>{text.emptyCandidates}</p> : <form onSubmit={event => { event.preventDefault(); if (!enabled || !confirmed || !selected.length || !runWithinBudget) return; operation.current ??= crypto.randomUUID(); void act({ action: "start", operationId: operation.current, submissionIds: selected }, text.queued).then(response => { if (response.state === "queued") void load(true); }); }}>
        <fieldset disabled={busy} className="staff-research-fields"><legend className="sr-only">{text.candidates}</legend><ul className="staff-advisory-candidates">{data.candidates.map(candidate => <li key={candidate.id}><label className="staff-research-check"><input type="checkbox" checked={selected.includes(candidate.id)} onChange={event => choose(candidate.id, event.target.checked)} aria-label={`${text.select} ${candidate.reference}`} /><span><strong><bdi>{candidate.reference}</bdi></strong><span className="staff-advisory-title" lang="en" dir="ltr">{candidate.title}</span><span>{text.rubricVersion}: {number(candidate.rubricVersion, locale)}</span></span></label></li>)}</ul>
          <p>{text.selected}: {number(selected.length, locale)} · {text.estimate}: {estimate === null ? text.unset : `${number(estimate, locale, 6)} ${settings.currency ?? ""}`}</p><p className="staff-muted">{text.reservedEstimate}</p><label className="staff-research-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>{text.runConfirmation}</span></label><Button type="submit" disabled={!enabled || !confirmed || !selected.length || !runWithinBudget}>{text.start}</Button>
        </fieldset>
      </form>}</section>
      <section className="staff-panel" aria-label={text.records}><h3>{text.records}</h3>{data.records?.length ? data.records.map(record => <AdvisoryRecordView key={record.id} locale={locale} record={record} />) : <p>{text.emptyRecords}</p>}</section>
      <section className="staff-panel" aria-label={text.runs}><h3>{text.runs}</h3><p>{text.runLogHint}</p>{data.runs?.length ? <div className="staff-table-scroll" role="region" tabIndex={0} aria-label={text.runs}><table className="staff-table"><thead><tr><th scope="col">{text.created}</th><th scope="col">{text.requested}</th><th scope="col">{text.completed}</th><th scope="col">{text.pending}</th><th scope="col">{text.failed}</th><th scope="col">{text.runErrors}</th></tr></thead><tbody>{data.runs.map(run => <tr key={run.id}><th scope="row"><time dateTime={run.createdAt}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(new Date(run.createdAt))}</time></th><td>{number(run.count, locale)}</td><td>{number(run.completed, locale)}</td><td>{number(run.pending, locale)}</td><td>{number(run.failed, locale)}</td><td>{run.errors.length ? <ul>{run.errors.map(error => <li key={error.code}>{text.errorCodes[error.code as keyof typeof text.errorCodes] ?? text.errors.unavailable}: {number(error.count, locale)}</li>)}</ul> : text.none}</td></tr>)}</tbody></table></div> : <p>{text.emptyRuns}</p>}</section>
    </> : null}
  </div>;
}

/** ENG-091: staff-only. No reviewer request or reveal, including completed cards. */
export function ReviewerAdvisory({ assignmentId }: { assignmentId: string }) { void assignmentId; return null; }
