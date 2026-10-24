"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import type { CertificateRecord, ParticipantCertificatePayload, ParticipantCertificateResponse, Survey } from "@/lib/certificates/contracts";
import { requestParticipantCertificates } from "./client";
import { certificateCopy, certificateMessage, eligibilityReason } from "./copy";
import "./certificates.css";

type Act = (payload: ParticipantCertificatePayload) => Promise<boolean>;
function SurveyForm({ locale, survey, busy, act, close }: { locale: Locale; survey: Survey; busy: boolean; act: Act; close: () => void }) {
  const copy = certificateCopy[locale], [answers, setAnswers] = useState<Record<string, string | number>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="certificate-card" aria-labelledby="certificate-survey-title"><h3 id="certificate-survey-title" tabIndex={-1} ref={heading}>{locale === "ar" ? survey.titleAr : survey.titleEn}</h3>
    <p className="certificate-note">{copy.privacy}</p>
    <form data-testid="certificate-survey-form" data-survey-id={survey.id} onSubmit={(event) => { event.preventDefault(); void act({ action: "submitSurvey", surveyId: survey.id, answers }).then((saved) => { if (saved) close(); }); }}>
      <fieldset className="certificate-form" disabled={busy}><legend className="sr-only">{copy.surveyHeading}</legend>
        {survey.questions.map((question, index) => {
          const id = `certificate-answer-${question.id}`, label = locale === "ar" ? question.labelAr : question.labelEn;
          return <div className="field" key={question.id}><label className="field-label" htmlFor={id}>{index + 1}. {label}{!question.required ? ` (${copy.optional})` : ""}</label>
            {question.type === "short_text" ? <textarea id={id} className="field-input" maxLength={1000} rows={3} required={question.required} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))} /> : <select id={id} className="field-input" required={question.required} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((previous) => { const next = { ...previous }; if (!event.target.value) delete next[question.id]; else next[question.id] = question.type === "rating_scale" ? Number(event.target.value) : event.target.value; return next; })}>
              <option value="">{copy.choose}</option>{question.type === "rating_scale" ? Array.from({ length: question.scaleMax! - question.scaleMin! + 1 }, (_, offset) => offset + question.scaleMin!).map((rating) => <option key={rating} value={rating}>{new Intl.NumberFormat(locale).format(rating)}</option>) : question.options!.map((option) => <option key={option.value} value={option.value}>{locale === "ar" ? option.labelAr : option.labelEn}</option>)}
            </select>}
          </div>;
        })}
        <div className="certificate-actions"><Button type="submit" disabled={!survey.questions.length}>{copy.submitSurvey}</Button><Button variant="secondary" onClick={close}>{copy.cancel}</Button></div>
      </fieldset>
    </form>
  </section>;
}

function CorrectionForm({ item, locale, busy, act }: { item: CertificateRecord; locale: Locale; busy: boolean; act: Act }) {
  const copy = certificateCopy[locale], [name, setName] = useState("");
  if (item.correction?.status === "pending") return <p role="status">{copy.correctionPending}: <bdi>{item.correction.requestedName}</bdi></p>;
  return <details><summary>{copy.correction}</summary><p>{copy.correctionHint}</p>
    {item.correction ? <p>{item.correction.status === "approved" ? copy.correctionApproved : copy.correctionRejected}</p> : null}
    <form onSubmit={(event) => { event.preventDefault(); void act({ action: "requestCorrection", certificateId: item.id, requestedName: name }).then((saved) => { if (saved) setName(""); }); }}><fieldset className="certificate-form" disabled={busy}>
      <legend className="sr-only">{copy.correction}</legend><div className="field"><label className="field-label" htmlFor={`certificate-correction-${item.id}`}>{copy.requestedName}</label><input id={`certificate-correction-${item.id}`} className="field-input" maxLength={120} required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></div><Button type="submit">{copy.requestCorrection}</Button>
    </fieldset></form>
  </details>;
}

export function ParticipantCertificates({ locale, initialState, standalone = false }: { locale: Locale; initialState?: ParticipantCertificateResponse; standalone?: boolean }) {
  const copy = certificateCopy[locale], [view, setView] = useState<ParticipantCertificateResponse | null>(initialState ?? null), [generation, setGeneration] = useState(0), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState(""), [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const alive = useRef(true), sequence = useRef(0), lock = useRef(false), status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    alive.current = true; const controller = new AbortController(), current = ++sequence.current;
    const startup = window.setTimeout(() => { void requestParticipantCertificates(locale, undefined, controller.signal).then((response) => { if (alive.current && !controller.signal.aborted && sequence.current === current) { setView(response); setNow(Date.now()); } }); }, 0);
    return () => { alive.current = false; controller.abort(); window.clearTimeout(startup); sequence.current += 1; };
  }, [locale, generation]);
  async function act(payload: ParticipantCertificatePayload) {
    if (lock.current || !view?.formToken) return false;
    lock.current = true; setBusy(true); setFeedback(""); const current = ++sequence.current;
    try {
      const response = await requestParticipantCertificates(locale, { ...payload, formToken: view.formToken });
      if (!alive.current || current !== sequence.current) return false;
      if (response.state === "ready") { setView(response); setFeedback(payload.action === "submitSurvey" ? copy.surveySaved : copy.saved); status.current?.focus(); return true; }
      if (["closed", "denied", "area-not-ready"].includes(response.state)) { setView(response); setSelectedSurvey(null); }
      else if (response.formToken) setView((previous) => previous ? { ...previous, formToken: response.formToken } : previous);
      setFeedback(response.state === "limited" ? copy.limited : response.state === "identifying_text" ? copy.identifyingText : copy.failure); status.current?.focus(); return false;
    } finally { if (alive.current && current === sequence.current) setBusy(false); lock.current = false; }
  }
  const surveyRows = view?.surveys?.filter((survey) => survey.published) ?? [], Heading = standalone ? "h1" : "h2";
  return <section className="certificate-area" aria-labelledby="participant-certificates-title" data-testid="participant-certificates" dir={locale === "ar" ? "rtl" : "ltr"}>
    <header><Heading id="participant-certificates-title">{copy.participantTitle}</Heading><p>{copy.participantLead}</p></header>
    <p className="certificate-feedback" role="status" tabIndex={-1} ref={status}>{busy ? copy.pending : feedback}</p>
    {!view ? <p>{copy.loading}</p> : view.state !== "ready" ? <div className="certificate-card"><p>{certificateMessage(view.state, locale)}</p>{!["closed", "denied"].includes(view.state) ? <Button variant="secondary" onClick={() => setGeneration((value) => value + 1)}>{copy.retry}</Button> : null}</div> : <>
      <section className="certificate-card" aria-labelledby="participant-certificate-eligibility"><h3 id="participant-certificate-eligibility">{copy.preview}</h3><p>{copy.evidenceHint}</p>
        {!view.eligibility?.length ? <p>{copy.noEligibility}</p> : <ul className="certificate-stack">{view.eligibility.map((item) => <li key={item.kind + (item.workshopId ?? "conference")}><h4>{copy[item.kind]}</h4><p>{item.activity}</p><p className="certificate-status">{item.eligible ? copy.eligible : copy.notEligible}</p>{item.reasons.length ? <ul>{item.reasons.map((reason) => <li key={reason}>{eligibilityReason(reason, locale)}</li>)}</ul> : null}</li>)}</ul>}
      </section>
      <section className="certificate-card" aria-labelledby="participant-certificate-surveys"><h3 id="participant-certificate-surveys">{copy.surveyHeading}</h3><p>{copy.answersSeparated}</p>
        {!surveyRows.length ? <p>{copy.surveyEmpty}</p> : <ul className="certificate-stack">{surveyRows.map((survey) => <li key={survey.id} data-testid="certificate-survey" data-survey-id={survey.id}><h4>{locale === "ar" ? survey.titleAr : survey.titleEn}</h4>{survey.deadline ? <p>{copy.surveyDeadline}: <time dateTime={survey.deadline}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(survey.deadline))}</time> ({copy.riyadh})</p> : null}{survey.completed ? <p className="certificate-status">{copy.completed}</p> : <Button variant="secondary" disabled={busy || !view.formToken || now !== null && Date.parse(survey.deadline ?? "") <= now} onClick={() => setSelectedSurvey(survey)}>{copy.takeSurvey}</Button>}</li>)}</ul>}
      </section>
      {selectedSurvey ? <SurveyForm key={selectedSurvey.id} locale={locale} survey={selectedSurvey} busy={busy} act={act} close={() => setSelectedSurvey(null)} /> : null}
      <section className="certificate-card" aria-labelledby="participant-certificate-list"><h3 id="participant-certificate-list">{copy.certificateHeading}</h3>
        {!view.certificates?.length ? <p>{copy.noCertificates}</p> : <ul className="certificate-stack">{view.certificates.map((item) => <li key={item.id} data-testid="participant-certificate"><h4>{copy[item.kind]}</h4><p><bdi>{item.recipientName}</bdi></p><p>{item.edition ? `${item.edition} · ` : ""}{item.activity}</p><p className="certificate-status">{copy.status[item.status]}</p>
          {item.status === "issued" ? <><div className="certificate-actions"><a className="button button--primary button--small" href={`/api/certificates/download?id=${encodeURIComponent(item.id)}`}>{copy.download}</a><a className="button button--secondary button--small" href={`/${locale}/certificates/verify/${encodeURIComponent(item.code)}`}>{copy.verify}</a></div><CorrectionForm item={item} locale={locale} busy={busy} act={act} /></> : item.status === "revoked" || item.status === "replaced" ? <a href={`/${locale}/certificates/verify/${encodeURIComponent(item.code)}`}>{copy.verify}</a> : null}
        </li>)}</ul>}
      </section>
    </>}
  </section>;
}
