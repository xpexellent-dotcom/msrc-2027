"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ABSTRACT_SPECIALTIES, ABSTRACT_STUDY_TYPES } from "@/content/abstract-taxonomy";
import { ContactPhoneField, phoneCountries } from "@/features/participant-accounts/contact-phone-field";
import { ProfileSubmissionGate } from "@/features/participant-accounts/profile-submission-gate";
import { AbstractRoadmap } from "@/features/research-competition/abstract-roadmap";
import type { Locale } from "@/lib/i18n";
import { ABSTRACT_BODY_KEYS, type AbstractDocument, type AbstractPresenter, type AbstractResponse, type AbstractSubmission } from "./contracts";
import { abstractDocumentIssues, abstractDraftIssues, blankAbstractDocument, countAbstractWords, countWords, submissionChanceUsed } from "./validation";
import { abstractCopy } from "./copy";

const suggested = { background: "40–50", objectives: "15–25", methods: "60–80", results: "80–100", limitations: "20–30", conclusion: "20–30" };

function newPresenterDocument(presenter?: AbstractPresenter): AbstractDocument {
  const document = blankAbstractDocument();
  return presenter ? { ...document, presentingAuthorId: presenter.id, authors: [{ id: presenter.id, name: presenter.name, email: presenter.email, affiliations: [presenter.institution] }] } : document;
}

export function AbstractWorkspace({ locale, initial, reviewMode = false }: { locale: Locale; initial: AbstractResponse; reviewMode?: boolean }) {
  const copy = abstractCopy[locale];
  const [result, setResult] = useState(initial), [current, setCurrent] = useState<AbstractSubmission | null>(null);
  const [document, setDocument] = useState<AbstractDocument | null>(() => reviewMode && initial.state === "ready" ? newPresenterDocument(initial.presenter) : null), [dirty, setDirty] = useState(false), [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(false), [message, setMessage] = useState(""), [autosaveFailed, setAutosaveFailed] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState("+966");
  const busy = useRef(false), mounted = useRef(true), operation = useRef<{ payload: string; id: string } | null>(null);
  const refresh = useCallback(() => reviewMode ? Promise.resolve(initial) : fetch("/api/abstracts?locale=" + locale, { credentials: "same-origin", cache: "no-store" })
    .then((response) => response.json() as Promise<AbstractResponse>).then((next) => { if (mounted.current) setResult(next); return next; })
    .catch(() => { if (mounted.current) setMessage(copy.unavailable); }), [locale, copy.unavailable, initial, reviewMode]);
  useEffect(() => { mounted.current = true; if (initial.state === "denied") void refresh(); return () => { mounted.current = false; }; }, [initial.state, refresh]);
  const save = useCallback(async (action: "save" | "finalize", showPreview = false) => {
    if (busy.current || result.state !== "ready" || !document) return;
    busy.current = true; setPending(true); setMessage("");
    try {
      let next: AbstractResponse;
      if (reviewMode) {
        // TEMPORARY preview: all mutations exist only in this mounted component.
        const row: AbstractSubmission = { id: current?.id ?? crypto.randomUUID(), reference: null, status: action === "finalize" ? "submitted" : "draft",
          version: (current?.version ?? 0) + 1, document: structuredClone(document), wordCount: countAbstractWords(document.body), finalizedAt: action === "finalize" ? new Date().toISOString() : null, decision: null };
        next = { ...result, submissions: [row], outcome: action === "finalize" ? "finalized" : "saved", submissionId: row.id };
      } else {
        const payload = { action, submissionId: current?.id ?? null, expectedVersion: current?.version ?? 0, ...(action === "save" ? { document } : {}) };
        const fingerprint = JSON.stringify(payload);
        if (operation.current?.payload !== fingerprint) operation.current = { payload: fingerprint, id: crypto.randomUUID() };
        const response = await fetch("/api/abstracts?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, operationId: operation.current.id, formToken: result.formToken }) });
        next = await response.json() as AbstractResponse;
      }
      if (!mounted.current) return;
      if (next.state === "profile_incomplete") { setResult({ ...result, profileComplete: false }); return; }
      if (next.state === "presenter_ineligible") { setResult({ ...result, presenterEligible: false }); setMessage(copy.presenter_ineligible); return; }
      if (next.state === "submission_used") { setAutosaveFailed(true); setMessage(copy.submission_used); void refresh(); return; }
      if (next.state !== "ready") { setAutosaveFailed(true); setMessage(next.state === "area-not-ready" ? copy.notReady : next.state === "limited" ? copy.limited : next.state === "invalid_input" ? copy.invalid : next.state === "closed" ? copy.closed : copy.unavailable); return; }
      setResult(next);
      if (next.outcome === "saved" || next.outcome === "finalized") {
        const row = next.submissions.find((entry) => entry.id === (next.submissionId ?? current?.id));
        if (!row) { setAutosaveFailed(true); setMessage(copy.unavailable); return; }
        setCurrent(row); setDocument(row.document); setDirty(false); setAutosaveFailed(false); setPreview(showPreview || action === "finalize");
        operation.current = null; setMessage(next.outcome === "finalized" ? copy.finalized : copy.saved);
      } else { setAutosaveFailed(true); setMessage(copy[next.outcome ?? "invalid"]); }
    } catch { if (mounted.current) { setAutosaveFailed(true); setMessage(copy.unavailable); } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }, [copy, current, document, locale, refresh, result, reviewMode]);
  const words = document ? countAbstractWords(document.body) : 6, titleWords = countWords(document?.title ?? "");
  const draftInvalid = document ? abstractDraftIssues(document).length > 0 : false;
  useEffect(() => {
    if (!dirty || pending || autosaveFailed || draftInvalid) return;
    const timer = window.setTimeout(() => void save("save"), 1200); return () => window.clearTimeout(timer);
  }, [autosaveFailed, dirty, pending, save, draftInvalid]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss); return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  function edit(change: Partial<AbstractDocument>) { if (document) { setDocument({ ...document, ...change }); setDirty(true); setAutosaveFailed(false); setMessage(""); } }
  function open(row: AbstractSubmission | null) {
    let next = row?.document ?? blankAbstractDocument();
    if ((!row || row.status === "draft" && row.finalizedAt === null) && result.state === "ready" && result.presenter) { const p = result.presenter; next = { ...next, presentingAuthorId: p.id, authors: [{ id: p.id, name: p.name, email: p.email, affiliations: [p.institution] }, ...next.authors.filter((author) => author.id !== next.presentingAuthorId && author.id !== p.id)] }; }
    setCurrent(row); setDocument(next); setDirty(false); setPreview(row !== null && (row.finalizedAt !== null || row.status !== "draft")); setMessage(""); setAutosaveFailed(false);
    setPhoneCountry(next.supervisor.phone ? phoneCountries.find((item) => next.supervisor.phone.startsWith(item.prefix))?.prefix ?? "" : "+966");
  }
  if (result.state === "profile_incomplete") return <ProfileSubmissionGate locale={locale} />;
  if (result.state !== "ready") return <section className="participant-account-card" data-testid="abstract-unavailable">
    <p role="status">{result.state === "closed" ? copy.closed : result.state === "area-not-ready" ? copy.notReady : result.state === "denied" ? copy.denied : result.state === "presenter_ineligible" ? copy.presenter_ineligible : result.state === "submission_used" ? copy.submission_used : copy.unavailable}</p>
    {result.state === "denied" ? <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : null}<ButtonLink href={`/${locale}/my-msrc`} variant="secondary">{copy.back}</ButtonLink>
  </section>;
  const used = submissionChanceUsed(result.submissions), locked = current !== null && (current.finalizedAt !== null || current.status !== "draft");
  const openWindow = result.settings.windowState === "open", issues = document ? abstractDocumentIssues(document) : [];
  const declarations = [["authorityConfirmed", copy.authority], ["englishConfirmed", copy.english], ["integrityConfirmed", copy.integrity], ["singlePresenterConfirmed", copy.singlePresenter], ["oneSubmissionConfirmed", copy.oneSubmission]] as const;
  const coauthors = document?.authors.filter((author) => author.id !== document.presentingAuthorId) ?? [];
  const presenter = document?.authors.find((author) => author.id === document.presentingAuthorId);
  const eligible = result.presenterEligible === true;
  const wordCounter = <p className={`abstract-word-count${preview || locked ? " abstract-count-static" : ""}${words > 350 ? " abstract-error" : ""}`} data-testid="abstract-word-count" aria-live="polite">{copy.words}: <bdi>{words} / 350</bdi></p>;
  return <div className="abstract-workspace" data-testid="abstract-workspace">
    {result.profileComplete !== true ? <ProfileSubmissionGate locale={locale} /> : !eligible ? <aside className="participant-account-card" data-testid="presenter-ineligible" aria-label={copy.presenter}><p role="status">{copy.presenter_ineligible}</p><ButtonLink href={`/${locale}/my-msrc#profile`}>{copy.editProfile}</ButtonLink></aside> : null}
    <aside className="participant-account-card abstract-guidance" aria-label={copy.scientific}><p>{copy.guidance}</p><p><strong>{copy.rules}</strong></p></aside>
    <section className="participant-account-card" aria-label={copy.title}>
      {!openWindow ? <p role="status">{copy.windowClosed}</p> : null}
      {!result.submissions.length ? <p>{copy.empty}</p> : <ul className="abstract-list">{result.submissions.map((row) => <li key={row.id}>
        <div><strong dir="ltr" lang="en">{row.document.title || copy.newDraft}</strong><span>{copy.status[row.status]} {row.reference ? <bdi>{row.reference}</bdi> : null}</span></div>
        <Button variant="secondary" disabled={pending || dirty} onClick={() => open(row)}>{copy.edit}</Button>
      </li>)}</ul>}
      {!result.submissions.some((row) => row.status === "draft") && !used ? <Button disabled={pending || dirty || !openWindow} onClick={() => open(null)}>{copy.create}</Button> : null}
      {used ? <p>{copy.submission_used}</p> : null}
    </section>
    {document ? <section className="participant-account-card abstract-editor" data-testid="abstract-editor">
      <h2>{current?.reference ?? copy.newDraft}</h2>
      <div className="abstract-save-status" role="status" aria-live="polite">{pending ? copy.saving : message || (dirty ? copy.unsaved : current && !locked ? copy.saved : "")}</div>
      {autosaveFailed ? <Button variant="secondary" disabled={pending} onClick={() => void refresh().then((next) => { if (next?.state === "ready") { const row = next.submissions.find((entry) => entry.id === current?.id); if (row) open(row); else { setAutosaveFailed(false); setMessage(""); } } })}>{copy.reload}</Button> : null}
      {locked ? <><p>{copy.locked}</p><AbstractRoadmap locale={locale} currentStep={current?.status === "scientific_review" ? 2 : current?.status === "administrative_review" ? 1 : current?.status === "final_material_received" ? 4 : ["accepted", "rejected", "conditionally_accepted", "revision_requested", "revision_expired"].includes(current?.status ?? "") ? 3 : 0} /></> : null}
      {current?.decision ? <aside className="abstract-author" aria-label={copy.status[current.status]}><h3>{copy.status[current.status]}</h3><p dir="ltr" lang="en">{current.decision.instructions}</p></aside> : null}
      {preview || locked ? wordCounter : null}
      {words > 350 ? <p role="alert">{copy.overLimit}</p> : null}{titleWords > 20 ? <p role="alert">{copy.titleOverLimit}</p> : null}
      {preview || locked ? <div className="abstract-preview" data-testid="abstract-preview">
        <h3>{copy.reviewStep}</h3><p>{copy.previewNote}</p>
        <h4 dir="ltr" lang="en">{document.title}</h4>
        <dl><dt>{copy.fields.studyType}</dt><dd>{ABSTRACT_STUDY_TYPES.find((item) => item.id === document.studyTypeId)?.[locale] ?? document.studyTypeId}{document.studyTypeId === "other" ? `: ${document.studyTypeOther}` : ""}</dd>
          <dt>{copy.fields.specialty}</dt><dd>{ABSTRACT_SPECIALTIES.find((item) => item.id === document.specialtyId)?.[locale] ?? document.specialtyId}</dd><dt>{copy.completion}</dt><dd>{document.analysisComplete ? "✓" : "—"}</dd></dl>
        <h4>{copy.authorsStep}</h4>{document.authors.map((author) => <p key={author.id} dir="ltr" lang="en">{author.name}{author.id === document.presentingAuthorId ? ` (${copy.presenter})` : ""}<br />{author.affiliations.join("; ")}<br />{author.email}</p>)}
        <h4>{copy.supervisor}</h4><p dir="ltr" lang="en">{document.supervisor.fullName}<br />{document.supervisor.email}<br />{document.supervisor.phone}</p>
        <h4>{copy.ethicsStep}</h4><dl><dt>{copy.fields.ethics}</dt><dd>{document.ethics.status === "approved" ? copy.fields.approval : document.ethics.status === "exempt" ? copy.fields.exempt : copy.fields.notRequired}</dd></dl><p dir="ltr" lang="en">{[document.ethics.committee, document.ethics.reference, document.ethics.explanation].filter(Boolean).join(" · ")}</p>
        <p>{document.registration.status === "registered" ? copy.fields.registered : copy.fields.notApplicable}</p><p dir="ltr" lang="en">{document.registration.registry} {document.registration.number}</p>
        {ABSTRACT_BODY_KEYS.map((key) => <section key={key}><h4>{copy.sections[key]}</h4><p dir="ltr" lang="en">{document.body[key]}</p></section>)}
        <h4>{copy.fields.conflicts}</h4><p dir="ltr" lang="en">{document.conflictOfInterest}</p><h4>{copy.fields.funding}</h4><p dir="ltr" lang="en">{document.fundingDeclaration}</p>
        <ul>{declarations.map(([key, label]) => <li key={key}>{document[key] ? "✓" : "—"} {label}</li>)}</ul>
      </div> : <>
        <fieldset disabled={pending} className="abstract-fields"><legend>{copy.researchDetails}</legend>
          <label htmlFor="abstract-title">{copy.fields.title}<input lang="en" dir="ltr" id="abstract-title" value={document.title} onChange={(event) => edit({ title: event.target.value })} /><span className={titleWords > 20 ? "abstract-error" : ""}><bdi>{titleWords} / 20</bdi> {copy.sectionWords}</span></label>
          <div className="abstract-grid"><label htmlFor="abstract-study-type">{copy.fields.studyType}<select id="abstract-study-type" value={document.studyTypeId} onChange={(event) => edit({ studyTypeId: event.target.value })}><option value="">{copy.choose}</option>{ABSTRACT_STUDY_TYPES.map((option) => <option key={option.id} value={option.id}>{option[locale]}</option>)}</select></label>
            <label htmlFor="abstract-specialty">{copy.fields.specialty}<select id="abstract-specialty" value={document.specialtyId} onChange={(event) => edit({ specialtyId: event.target.value })}><option value="">{copy.choose}</option>{ABSTRACT_SPECIALTIES.map((option) => <option key={option.id} value={option.id}>{option[locale]}</option>)}</select></label></div>
          {document.studyTypeId === "other" ? <label htmlFor="abstract-study-other">{copy.fields.studyTypeOther}<input id="abstract-study-other" lang="en" dir="ltr" maxLength={80} value={document.studyTypeOther} onChange={(event) => edit({ studyTypeOther: event.target.value })} /></label> : null}
          <label className="abstract-consent"><input type="checkbox" checked={document.analysisComplete} onChange={(event) => edit({ analysisComplete: event.target.checked })} /><span>{copy.completion}</span></label>
        </fieldset>
        <fieldset disabled={pending} className="abstract-fields"><legend>{copy.authorsStep}</legend><p>{copy.roles}</p>
          <div className="abstract-author"><h3>{copy.presenter}</h3><p dir="ltr" lang="en">{presenter?.name}<br />{presenter?.email}<br />{presenter?.affiliations.join("; ")}</p><ButtonLink variant="secondary" href={`/${locale}/my-msrc#profile`}>{copy.editProfile}</ButtonLink></div>
          <h3>{copy.authorHeading}</h3>
          {coauthors.map((author, index) => <fieldset key={author.id} className="abstract-author"><legend>{copy.fields.author} {index + 1}</legend>
            <label htmlFor={`author-name-${author.id}`}>{copy.fields.name}<input lang="en" dir="ltr" id={`author-name-${author.id}`} value={author.name} onChange={(event) => edit({ authors: document.authors.map((entry) => entry.id === author.id ? { ...entry, name: event.target.value } : entry) })} /></label>
            <label htmlFor={`author-email-${author.id}`}>{copy.fields.email} ({copy.optionalEmail})<input lang="en" dir="ltr" type="email" id={`author-email-${author.id}`} value={author.email} onChange={(event) => edit({ authors: document.authors.map((entry) => entry.id === author.id ? { ...entry, email: event.target.value } : entry) })} /></label>
            <label htmlFor={`author-affiliations-${author.id}`}>{copy.fields.affiliations}<textarea lang="en" dir="ltr" id={`author-affiliations-${author.id}`} rows={2} value={author.affiliations.join("\n")} onChange={(event) => edit({ authors: document.authors.map((entry) => entry.id === author.id ? { ...entry, affiliations: event.target.value.split("\n") } : entry) })} /></label>
            <div className="participant-account-actions"><Button variant="secondary" disabled={index === 0} onClick={() => { const reordered = [...coauthors]; [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]; edit({ authors: [...(presenter ? [presenter] : []), ...reordered] }); }}>{copy.up}</Button>
              <Button variant="secondary" disabled={index === coauthors.length - 1} onClick={() => { const reordered = [...coauthors]; [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]]; edit({ authors: [...(presenter ? [presenter] : []), ...reordered] }); }}>{copy.down}</Button>
              <Button variant="secondary" onClick={() => edit({ authors: document.authors.filter((entry) => entry.id !== author.id) })}>{copy.remove}</Button></div>
          </fieldset>)}
          <Button variant="secondary" onClick={() => edit({ authors: [...document.authors, { id: crypto.randomUUID(), name: "", email: "", affiliations: [""] }] })}>{copy.addAuthor}</Button>
          <h3>{copy.supervisor}</h3>
          <label htmlFor="abstract-supervisor-name">{copy.fields.supervisorName}<input id="abstract-supervisor-name" lang="en" dir="ltr" value={document.supervisor.fullName} onChange={(event) => edit({ supervisor: { ...document.supervisor, fullName: event.target.value } })} /></label>
          <label htmlFor="abstract-supervisor-email">{copy.fields.supervisorEmail}<input id="abstract-supervisor-email" type="email" dir="ltr" value={document.supervisor.email} onChange={(event) => edit({ supervisor: { ...document.supervisor, email: event.target.value } })} /></label>
          <ContactPhoneField id="abstract-supervisor-phone" locale={locale} country={phoneCountry} onCountryChange={setPhoneCountry} value={document.supervisor.phone} onChange={(phone) => edit({ supervisor: { ...document.supervisor, phone } })} labels={{ country: copy.country, phone: copy.phone, hint: copy.phoneHint, international: copy.internationalPhone }} />
        </fieldset>
        <fieldset disabled={pending} className="abstract-fields"><legend>{copy.ethicsStep}</legend><p>{copy.ethicsHelp}</p>
          <label htmlFor="abstract-ethics">{copy.fields.ethics}<select id="abstract-ethics" value={document.ethics.status} onChange={(event) => edit({ ethics: { ...document.ethics, status: event.target.value as AbstractDocument["ethics"]["status"] } })}><option value="approved">{copy.fields.approval}</option><option value="exempt">{copy.fields.exempt}</option><option value="not_required">{copy.fields.notRequired}</option></select></label>
          {document.ethics.status === "approved" ? <label htmlFor="abstract-committee">{copy.fields.committee}<input id="abstract-committee" dir="ltr" lang="en" value={document.ethics.committee} onChange={(event) => edit({ ethics: { ...document.ethics, committee: event.target.value } })} /></label> : null}
          {document.ethics.status !== "not_required" ? <label htmlFor="abstract-ethics-reference">{copy.fields.reference}<input id="abstract-ethics-reference" dir="ltr" lang="en" value={document.ethics.reference} onChange={(event) => edit({ ethics: { ...document.ethics, reference: event.target.value } })} /></label> : null}
          {document.ethics.status !== "approved" ? <label htmlFor="abstract-ethics-explanation">{copy.fields.ethicsExplanation}<textarea id="abstract-ethics-explanation" dir="ltr" lang="en" value={document.ethics.explanation} onChange={(event) => edit({ ethics: { ...document.ethics, explanation: event.target.value } })} /></label> : null}
          <p>{copy.registrationHelp}</p><label htmlFor="abstract-registration">{copy.fields.registration}<select id="abstract-registration" value={document.registration.status} onChange={(event) => edit({ registration: { ...document.registration, status: event.target.value as AbstractDocument["registration"]["status"] } })}><option value="not_applicable">{copy.fields.notApplicable}</option><option value="registered">{copy.fields.registered}</option></select></label>
          {document.registration.status === "registered" ? <><label htmlFor="abstract-registry">{copy.fields.registry}<input id="abstract-registry" dir="ltr" lang="en" value={document.registration.registry} onChange={(event) => edit({ registration: { ...document.registration, registry: event.target.value } })} /></label><label htmlFor="abstract-registration-number">{copy.fields.registrationNumber}<input id="abstract-registration-number" dir="ltr" lang="en" value={document.registration.number} onChange={(event) => edit({ registration: { ...document.registration, number: event.target.value } })} /></label></> : null}
        </fieldset>
        <fieldset disabled={pending} className="abstract-fields"><legend>{copy.abstractStep}</legend>{wordCounter}<p>{copy.guidance}</p>
          {ABSTRACT_BODY_KEYS.map((key) => <label key={key} htmlFor={`abstract-${key}`}><span className="abstract-section-label">{copy.sections[key]} · <bdi dir="ltr">{suggested[key]}</bdi> {copy.suggested}</span><textarea lang="en" dir="ltr" id={`abstract-${key}`} rows={key === "results" ? 5 : 3} value={document.body[key]} onChange={(event) => edit({ body: { ...document.body, [key]: event.target.value } })} /><span><bdi>{countWords(document.body[key])}</bdi> {copy.sectionWords}</span></label>)}
        </fieldset>
        <fieldset disabled={pending} className="abstract-fields"><legend>{copy.declarationsStep}</legend>
          <label htmlFor="abstract-conflicts">{copy.fields.conflicts}<textarea lang="en" dir="ltr" id="abstract-conflicts" value={document.conflictOfInterest} onChange={(event) => edit({ conflictOfInterest: event.target.value })} /></label>
          <label htmlFor="abstract-funding">{copy.fields.funding}<textarea lang="en" dir="ltr" id="abstract-funding" value={document.fundingDeclaration} onChange={(event) => edit({ fundingDeclaration: event.target.value })} /></label>
          {declarations.map(([key, label]) => <label className="abstract-consent" key={key}><input type="checkbox" checked={document[key]} onChange={(event) => edit({ [key]: event.target.checked })} /><span>{label}</span></label>)}
        </fieldset>
      </>}
      {!locked ? <div className="abstract-review-actions"><h3>{copy.reviewStep}</h3><p className="abstract-one-chance"><strong>{copy.rules}</strong></p>
        {preview && issues.length ? <p role="alert">{copy.invalid}</p> : null}
        <div className="participant-account-actions">{preview ? <><Button variant="secondary" disabled={pending} onClick={() => setPreview(false)}>{copy.editAgain}</Button><>{result.profileComplete !== true ? <ButtonLink href={`/${locale}/my-msrc#profile`}>{copy.editProfile}</ButtonLink> : <Button disabled={pending || !openWindow || !eligible || used || issues.length > 0} onClick={() => void save("finalize")}>{copy.finalize}</Button>}</></> : <><Button variant="secondary" disabled={pending || draftInvalid || !openWindow || used} onClick={() => void save("save")}>{copy.save}</Button><Button disabled={pending || draftInvalid || !openWindow || used} onClick={() => void save("save", true)}>{copy.preview}</Button></>}</div>
      </div> : null}
    </section> : null}
  </div>;
}
