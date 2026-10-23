"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { ABSTRACT_BODY_KEYS, type AbstractDocument, type AbstractResponse, type AbstractSubmission } from "./contracts";
import { abstractDocumentIssues, countAbstractWords } from "./validation";
import { abstractCopy } from "./copy";

const headings = {
  research: { background: "Background", aim: "Aim", methods: "Methods", results: "Results / Current Progress", conclusion: "Conclusion / Current Implications" },
  case_report: { background: "Background / Context", aim: "Case Presentation", methods: "Discussion", results: "Outcome", conclusion: "Conclusion" },
};
function blankDocument(): AbstractDocument {
  return { title: "", specialtyId: "", studyTypeId: "", completionStatus: "ongoing", body: { background: "", aim: "", methods: "", results: "", conclusion: "" },
    authors: [{ id: crypto.randomUUID(), name: "", email: "", affiliations: [""] }], piAuthorId: "", correspondingAuthorId: "", presentingAuthorId: null,
    keywords: [], ethicsStatus: "approval_required", ethicsExplanation: "", conflictOfInterest: "", fundingDeclaration: "", authorityConfirmed: false };
}

export function AbstractWorkspace({ locale, initial }: { locale: Locale; initial: AbstractResponse }) {
  const copy = abstractCopy[locale];
  const [result, setResult] = useState(initial), [current, setCurrent] = useState<AbstractSubmission | null>(null);
  const [document, setDocument] = useState<AbstractDocument | null>(null), [dirty, setDirty] = useState(false), [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(false), [message, setMessage] = useState(""), [autosaveFailed, setAutosaveFailed] = useState(false);
  const busy = useRef(false), mounted = useRef(true);
  const operation = useRef<{ payload: string; id: string } | null>(null);
  const refresh = useCallback(() => fetch("/api/abstracts?locale=" + locale, { credentials: "same-origin", cache: "no-store" })
    .then((response) => response.json() as Promise<AbstractResponse>).then((next) => { if (mounted.current) setResult(next); return next; })
    .catch(() => { if (mounted.current) setMessage(copy.unavailable); }), [locale, copy.unavailable]);
  useEffect(() => { mounted.current = true; if (initial.state === "denied") void refresh(); return () => { mounted.current = false; }; }, [initial.state, refresh]);
  const save = useCallback(async (action: "save" | "finalize", showPreview = false) => {
    if (busy.current || result.state !== "ready" || !document) return;
    busy.current = true; setPending(true); setMessage("");
    try {
      const payload = { action, submissionId: current?.id ?? null, expectedVersion: current?.version ?? 0, ...(action === "save" ? { document } : {}) };
      const fingerprint = JSON.stringify(payload);
      if (operation.current?.payload !== fingerprint) operation.current = { payload: fingerprint, id: crypto.randomUUID() };
      const response = await fetch("/api/abstracts?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, operationId: operation.current.id, formToken: result.formToken }) });
      const next = await response.json() as AbstractResponse;
      if (!mounted.current) return;
      if (next.state !== "ready") { setAutosaveFailed(true); setMessage(next.state === "area-not-ready" ? copy.notReady : next.state === "limited" ? copy.limited : next.state === "invalid_input" ? copy.invalid : next.state === "closed" ? copy.closed : copy.unavailable); return; }
      setResult(next);
      if (next.outcome === "saved" || next.outcome === "finalized") {
        const row = next.submissions.find((entry) => entry.id === (next.submissionId ?? current?.id));
        if (!row) { setAutosaveFailed(true); setMessage(copy.unavailable); return; }
        setCurrent(row); setDocument(row.document); setDirty(false); setAutosaveFailed(false); setPreview(showPreview || action === "finalize");
        operation.current = null;
        setMessage(next.outcome === "finalized" ? copy.finalized : copy.saved);
      } else { setAutosaveFailed(true); setMessage(copy[next.outcome ?? "invalid"]); }
    } catch { if (mounted.current) { setAutosaveFailed(true); setMessage(copy.unavailable); } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }, [copy, current, document, locale, result]);
  const words = document ? countAbstractWords(document.body) : 0;
  useEffect(() => {
    if (!dirty || pending || autosaveFailed || words > 300) return;
    const timer = window.setTimeout(() => void save("save"), 1200);
    return () => window.clearTimeout(timer);
  }, [autosaveFailed, dirty, pending, save, words]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss); return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  function edit(change: Partial<AbstractDocument>) { if (document) { setDocument({ ...document, ...change }); setDirty(true); setAutosaveFailed(false); setMessage(""); } }
  function open(row: AbstractSubmission | null) { setCurrent(row); setDocument(row?.document ?? blankDocument()); setDirty(false); setPreview(row !== null && !["draft", "revision_requested"].includes(row.status)); setMessage(""); setAutosaveFailed(false); }
  if (result.state !== "ready") return <section className="participant-account-card" data-testid="abstract-unavailable">
    <p role="status">{result.state === "closed" ? copy.closed : result.state === "area-not-ready" ? copy.notReady : result.state === "denied" ? copy.denied : copy.unavailable}</p>
    {result.state === "denied" ? <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : null}<ButtonLink href={`/${locale}/my-msrc`} variant="secondary">{copy.back}</ButtonLink>
  </section>;
  const revision = current?.status === "revision_requested", locked = current !== null && !["draft", "revision_requested"].includes(current.status), template = result.settings.studyTypes.find((entry) => entry.id === document?.studyTypeId)?.template ?? "research";
  // The database clock enforces revision deadlines; the client never grants an extension.
  const openWindow = result.settings.windowState === "open" || revision;
  return <div className="abstract-workspace" data-testid="abstract-workspace">
    <aside className="participant-account-card abstract-guidance"><p>{copy.guidance}</p><p>{copy.rules}</p><p>{copy.uploadGate}</p></aside>
    <section className="participant-account-card" aria-label={copy.title}>
      {!openWindow ? <p role="status">{copy.windowClosed}</p> : null}
      {!result.submissions.length ? <p>{copy.empty}</p> : <ul className="abstract-list">{result.submissions.map((row) => <li key={row.id}>
        <div><strong dir="ltr" lang="en">{row.document.title || copy.newDraft}</strong><span>{copy.status[row.status]} {row.reference ? <bdi>{row.reference}</bdi> : null}</span></div>
        <Button variant="secondary" disabled={pending || dirty} onClick={() => open(row)}>{copy.edit}</Button>
      </li>)}</ul>}
      <Button disabled={pending || dirty || !openWindow} onClick={() => open(null)}>{copy.create}</Button>
    </section>
    {document ? <section className="participant-account-card abstract-editor" data-testid="abstract-editor">
      <h2>{current?.reference ?? copy.newDraft}</h2>
      <div className="abstract-save-status" role="status" aria-live="polite">{pending ? copy.saving : message || (dirty ? copy.unsaved : current ? copy.saved : "")}</div>
      {autosaveFailed ? <Button variant="secondary" disabled={pending} onClick={() => void refresh().then((next) => {
        if (!mounted.current || next?.state !== "ready") return;
        const row = next.submissions.find((entry) => entry.id === current?.id);
        if (row) open(row);
        else { setAutosaveFailed(false); setMessage(""); }
      })}>{copy.reload}</Button> : null}
      {locked ? <p>{copy.locked}</p> : preview ? <p>{copy.previewNote}</p> : null}
      <p>{copy.roles}</p>
      {current?.decision ? <aside className="abstract-author"><h3>{current.decision.outcome === "revise" ? copy.revision : copy.status[current.status]}</h3>
        <p dir="ltr" lang="en">{current.decision.instructions}</p>
        {current.decision.revisionDeadline ? <p>{copy.deadline}: <time dateTime={current.decision.revisionDeadline}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(current.decision.revisionDeadline))}</time></p> : null}
        {revision ? <p>{copy.permitted}</p> : null}
      </aside> : null}
      <p className={words > 300 ? "abstract-word-count abstract-error" : "abstract-word-count"} data-testid="abstract-word-count" aria-live="polite">{copy.words}: <bdi>{words} / 300</bdi></p>
      {words > 300 ? <p role="alert">{copy.overLimit}</p> : null}
      <fieldset disabled={pending || preview || locked} className="abstract-fields" dir={locale === "ar" ? "rtl" : "ltr"}>
        <legend>{copy.scientific}</legend>
        <label htmlFor="abstract-title">{copy.fields.title}<input lang="en" dir="ltr" id="abstract-title" value={document.title} onChange={(event) => edit({ title: event.target.value })} /></label>
        <div className="abstract-grid">
          <label htmlFor="abstract-specialty">{copy.fields.specialty}<select dir="ltr" lang="en" disabled={revision} id="abstract-specialty" value={document.specialtyId} onChange={(event) => edit({ specialtyId: event.target.value })}><option value="">{copy.choose}</option>{result.settings.specialties.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label htmlFor="abstract-study-type">{copy.fields.studyType}<select dir="ltr" lang="en" disabled={revision} id="abstract-study-type" value={document.studyTypeId} onChange={(event) => edit({ studyTypeId: event.target.value })}><option value="">{copy.choose}</option>{result.settings.studyTypes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        </div>
        <label htmlFor="abstract-completion">{copy.fields.completion}<select disabled={revision} id="abstract-completion" value={document.completionStatus} onChange={(event) => edit({ completionStatus: event.target.value as AbstractDocument["completionStatus"] })}><option value="ongoing">{copy.fields.ongoing}</option><option value="completed">{copy.fields.completed}</option></select></label>
        {ABSTRACT_BODY_KEYS.map((key) => <label key={key} htmlFor={`abstract-${key}`}>{headings[template][key]}<textarea lang="en" dir="ltr" id={`abstract-${key}`} rows={3} value={document.body[key]} onChange={(event) => edit({ body: { ...document.body, [key]: event.target.value } })} /></label>)}
        <label htmlFor="abstract-keywords">{copy.fields.keywords}{result.settings.keywordCount !== null ? ` (${result.settings.keywordCount} ${copy.fields.required})` : ""}<textarea lang="en" dir="ltr" id="abstract-keywords" rows={2} value={document.keywords.join("\n")} onChange={(event) => edit({ keywords: event.target.value === "" ? [] : event.target.value.split("\n") })} /></label>
        <h3>{copy.authorHeading}</h3>
        {document.authors.map((author, index) => <fieldset key={author.id} className="abstract-author" disabled={revision}><legend>{copy.fields.author} {index + 1}</legend>
          <label htmlFor={`author-name-${author.id}`}>{copy.fields.name}<input lang="en" dir="ltr" id={`author-name-${author.id}`} value={author.name} onChange={(event) => edit({ authors: document.authors.map((entry) => entry.id === author.id ? { ...entry, name: event.target.value } : entry) })} /></label>
          <label htmlFor={`author-email-${author.id}`}>{copy.fields.email} ({author.id === document.piAuthorId || author.id === document.correspondingAuthorId ? copy.requiredEmail : copy.optionalEmail})<input lang="en" dir="ltr" type="email" id={`author-email-${author.id}`} value={author.email} onChange={(event) => edit({ authors: document.authors.map((entry) => entry.id === author.id ? { ...entry, email: event.target.value } : entry) })} /></label>
          <label htmlFor={`author-affiliations-${author.id}`}>{copy.fields.affiliations}<textarea lang="en" dir="ltr" id={`author-affiliations-${author.id}`} rows={2} value={author.affiliations.join("\n")} onChange={(event) => edit({ authors: document.authors.map((entry) => entry.id === author.id ? { ...entry, affiliations: event.target.value.split("\n") } : entry) })} /></label>
          <div className="participant-account-actions">
            <Button variant="secondary" disabled={index === 0} onClick={() => { const authors = [...document.authors]; [authors[index - 1], authors[index]] = [authors[index], authors[index - 1]]; edit({ authors }); }}>{copy.up}</Button>
            <Button variant="secondary" disabled={index === document.authors.length - 1} onClick={() => { const authors = [...document.authors]; [authors[index + 1], authors[index]] = [authors[index], authors[index + 1]]; edit({ authors }); }}>{copy.down}</Button>
            <Button variant="secondary" onClick={() => edit({ authors: document.authors.filter((entry) => entry.id !== author.id), ...(document.piAuthorId === author.id ? { piAuthorId: "" } : {}), ...(document.correspondingAuthorId === author.id ? { correspondingAuthorId: "" } : {}), ...(document.presentingAuthorId === author.id ? { presentingAuthorId: null } : {}) })}>{copy.remove}</Button>
          </div>
        </fieldset>)}
        <Button variant="secondary" disabled={revision} onClick={() => edit({ authors: [...document.authors, { id: crypto.randomUUID(), name: "", email: "", affiliations: [""] }] })}>{copy.addAuthor}</Button>
        {([ ["piAuthorId", copy.fields.pi], ["correspondingAuthorId", copy.fields.corresponding], ["presentingAuthorId", copy.fields.presenter] ] as const).map(([key, label]) => <label key={key} htmlFor={`abstract-${key}`}>{label}<select disabled={revision} id={`abstract-${key}`} value={document[key] ?? ""} onChange={(event) => edit({ [key]: event.target.value || (key === "presentingAuthorId" ? null : "") })}><option value="">{key === "presentingAuthorId" ? copy.none : copy.choose}</option>{document.authors.map((author, index) => <option key={author.id} value={author.id}>{author.name || `${copy.fields.author} ${index + 1}`}</option>)}</select></label>)}
        {result.settings.correspondingAuthorPolicy ? <p dir="ltr" lang="en">{result.settings.correspondingAuthorPolicy}</p> : null}
        <p>{copy.policyCheck}</p>
        <label htmlFor="abstract-ethics">{copy.fields.ethics}<select disabled={revision} id="abstract-ethics" value={document.ethicsStatus} onChange={(event) => edit({ ethicsStatus: event.target.value as AbstractDocument["ethicsStatus"] })}><option value="approval_required">{copy.fields.approval}</option><option value="exempt">{copy.fields.exempt}</option><option value="not_required">{copy.fields.notRequired}</option></select></label>
        <label htmlFor="abstract-ethics-explanation">{copy.fields.ethicsExplanation}<textarea lang="en" dir="ltr" disabled={revision} id="abstract-ethics-explanation" value={document.ethicsExplanation} onChange={(event) => edit({ ethicsExplanation: event.target.value })} /></label>
        <label htmlFor="abstract-conflicts">{copy.fields.conflicts}<textarea lang="en" dir="ltr" disabled={revision} id="abstract-conflicts" value={document.conflictOfInterest} onChange={(event) => edit({ conflictOfInterest: event.target.value })} /></label>
        <label htmlFor="abstract-funding">{copy.fields.funding}<textarea lang="en" dir="ltr" disabled={revision} id="abstract-funding" value={document.fundingDeclaration} onChange={(event) => edit({ fundingDeclaration: event.target.value })} /></label>
      </fieldset>
      <label className="abstract-consent"><input type="checkbox" disabled={pending || preview || locked || revision} checked={document.authorityConfirmed} onChange={(event) => edit({ authorityConfirmed: event.target.checked })} /><span>{copy.authority}</span></label>
      {!locked ? <div className="participant-account-actions">{preview ? <><Button variant="secondary" disabled={pending} onClick={() => setPreview(false)}>{copy.editAgain}</Button><Button disabled={pending || !openWindow || abstractDocumentIssues(document, result.settings).length > 0} onClick={() => void save("finalize")}>{copy.finalize}</Button></> : <><Button variant="secondary" disabled={pending || words > 300 || !openWindow} onClick={() => void save("save")}>{copy.save}</Button><Button disabled={pending || words > 300 || !openWindow} onClick={() => void save("save", true)}>{copy.preview}</Button></>}</div> : null}
      {preview && !locked && abstractDocumentIssues(document, result.settings).length ? <p role="alert">{copy.invalid}</p> : null}
    </section> : null}
  </div>;
}
