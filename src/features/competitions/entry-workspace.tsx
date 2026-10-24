"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { HACKATHON_TRACKS, emptyHackathonDocument, emptyThesisDocument, type CompetitionDocument, type CompetitionEntry, type CompetitionKind, type CompetitionResponse, type HackathonDocument } from "./contracts";
import { countPitchWords } from "./validation";
import { competitionCopy } from "./copy";

const originalityKeys = ["newIdea", "notPreviouslyEntered", "notPrizeWinning", "notFunded", "notCommerciallyLaunched", "authorityConfirmed"] as const;

export function EntryWorkspace({ locale, kind, initial }: { locale: Locale; kind: CompetitionKind; initial: CompetitionResponse }) {
  const copy = competitionCopy[locale];
  const [result, setResult] = useState(initial), [current, setCurrent] = useState<CompetitionEntry | null>(null);
  const [document, setDocument] = useState<CompetitionDocument | null>(null), [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false), [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [supportingFile, setSupportingFile] = useState<File | null>(null), [finalFile, setFinalFile] = useState<File | null>(null);
  const busy = useRef(false), mounted = useRef(true), operation = useRef<{ fingerprint: string; id: string } | null>(null);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (initial.state !== "denied") return;
    // A page render observes sessions without mutation; the API may refresh the
    // same native session before presenting a new sign-in requirement.
    let active = true;
    void fetch("/api/competitions?locale=" + locale, { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json() as Promise<CompetitionResponse>)
      .then((next) => { if (active) setResult(next); }).catch(() => {});
    return () => { active = false; };
  }, [initial.state, locale]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  function open(entry: CompetitionEntry | null) {
    setCurrent(entry); setDocument(entry?.document ?? (kind === "hackathon" ? emptyHackathonDocument() : emptyThesisDocument()));
    setDirty(false); setPreview(entry !== null && entry.status !== "draft"); setMessage(""); setEmail(""); setSupportingFile(null); setFinalFile(null); operation.current = null;
  }
  function edit(change: Partial<CompetitionDocument>) {
    if (!document) return;
    setDocument({ ...document, ...change } as CompetitionDocument); setDirty(true); setMessage("");
  }
  function resultMessage(next: CompetitionResponse): string {
    if (next.state !== "ready") return next.state === "closed" ? copy.closed : next.state === "area-not-ready" ? copy.notReady
      : next.state === "limited" ? copy.limited : next.state === "invalid_input" ? copy.invalid : next.state === "denied" ? copy.denied : copy.unavailable;
    if (next.outcome === "saved") return copy.saved;
    if (next.outcome === "submitted") return copy.submitted;
    if (next.outcome === "conflict" || next.outcome === "locked") return copy.conflict;
    if (["closed", "not_ready", "settings_incomplete"].includes(next.outcome ?? "")) return copy.windowClosed;
    if (next.outcome === "invited" || next.outcome === "confirmed") return next.outcome === "confirmed" ? copy.confirmed : copy.registered;
    if (next.outcome === "limited") return copy.limited;
    if (["roster_limit", "already_member", "verified_account_required"].includes(next.outcome ?? "")) return copy.memberUnavailable;
    return copy.invalid;
  }
  async function refresh() {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try {
      const response = await fetch("/api/competitions?locale=" + locale, { credentials: "same-origin", cache: "no-store" });
      const next = await response.json() as CompetitionResponse;
      if (!mounted.current) return;
      setResult(next);
      if (next.state === "ready") {
        const entry = next.entries.find((row) => row.id === current?.id);
        if (entry) open(entry);
      } else setMessage(resultMessage(next));
    } catch { if (mounted.current) setMessage(copy.unavailable); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  async function mutate(action: "save" | "submit" | "invite" | "confirm", showPreview = false) {
    if (busy.current || result.state !== "ready" || !document) return;
    busy.current = true; setPending(true); setMessage("");
    try {
      const payload = { action, kind, entryId: current?.id ?? null, expectedVersion: current?.version ?? 0,
        ...(action === "save" ? { document } : {}), ...(action === "invite" ? { email: email.trim() } : {}) };
      const fingerprint = JSON.stringify(payload);
      if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, id: crypto.randomUUID() };
      const response = await fetch("/api/competitions?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, operationId: operation.current.id, formToken: result.formToken }) });
      const next = await response.json() as CompetitionResponse;
      if (!mounted.current) return;
      setMessage(resultMessage(next));
      // Keep local text on failure; a renewed token may still be used for an explicit retry.
      if (next.state !== "ready") return;
      setResult(next);
      if (["saved", "submitted", "invited", "confirmed"].includes(next.outcome ?? "")) {
        const entry = next.entries.find((row) => row.id === (next.entryId ?? current?.id));
        if (!entry) { setMessage(copy.unavailable); return; }
        setCurrent(entry); setDocument(entry.document); setDirty(false); setPreview(showPreview || entry.status !== "draft");
        if (action === "invite") setEmail("");
        operation.current = null;
      }
    } catch { if (mounted.current) setMessage(copy.unavailable); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  async function fileAction(action: "file_reserve" | "file_read", stage: "supporting" | "final", file?: File | null, fileId?: string) {
    if (busy.current || result.state !== "ready" || !current || dirty) return;
    if (action === "file_reserve" && (!file || !["application/pdf", "image/png", "image/jpeg"].includes(file.type) || file.size === 0 || file.size > 25 * 1024 * 1024)) { setMessage(copy.fileInvalid); return; }
    busy.current = true; setPending(true); setMessage("");
    try {
      const payload = { action, kind, entryId: current.id, expectedVersion: current.version,
        ...(action === "file_reserve" && file ? { metadata: { name: file.name, mime: file.type, size: file.size, stage } } : { fileId }) };
      const fingerprint = JSON.stringify(payload);
      if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, id: crypto.randomUUID() };
      const response = await fetch("/api/competitions?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, operationId: operation.current.id, formToken: result.formToken }) });
      const next = await response.json() as CompetitionResponse;
      if (!mounted.current) return;
      if (next.state !== "ready") { setMessage(resultMessage(next)); return; }
      setResult(next);
      const entry = next.entries.find((row) => row.id === current.id);
      if (entry) { setCurrent(entry); setDocument(entry.document); }
      const transfer = next.fileTransfer;
      if (!transfer || transfer.operation !== (action === "file_reserve" ? "upload" : "download")) { setMessage(copy.fileNotReady); return; }
      if (action === "file_read") { window.location.assign(transfer.url); return; }
      const uploaded = await fetch(transfer.url, { method: "PUT", credentials: "omit", redirect: "error", cache: "no-store", headers: { "Content-Type": file!.type, "x-upsert": "false" }, body: file! });
      if (!uploaded.ok) { setMessage(copy.unavailable); return; }
      await uploaded.body?.cancel();
      const refreshed = await fetch("/api/competitions?locale=" + locale, { credentials: "same-origin", cache: "no-store" });
      const latest = await refreshed.json() as CompetitionResponse;
      if (!mounted.current) return;
      if (latest.state === "ready") {
        setResult(latest); const saved = latest.entries.find((row) => row.id === current.id);
        if (saved) { setCurrent(saved); setDocument(saved.document); }
      }
      setMessage(copy.filePending); operation.current = null;
      if (stage === "supporting") setSupportingFile(null); else setFinalFile(null);
    } catch { if (mounted.current) setMessage(copy.unavailable); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }

  if (result.state !== "ready") return <section className="participant-account-card" data-testid="competition-unavailable">
    <p role="status">{resultMessage(result)}</p>
    <div className="competition-actions">{result.state === "denied" ? <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : null}
      <ButtonLink href={`/${locale}/my-msrc`} variant="secondary">{copy.back}</ButtonLink></div>
  </section>;
  const settings = result.settings[kind], entryOpen = settings.stageStates.entry === "open", membershipOpen = settings.stageStates.membership === "open";
  const entries = result.entries.filter((entry) => entry.kind === kind), locked = current !== null && current.status !== "draft";
  const hackathon = kind === "hackathon" && document && "pitch" in document ? document : null;
  const thesis = kind === "three_minute_thesis" && document && "narrative" in document ? document : null;
  const words = hackathon ? countPitchWords(hackathon.pitch) : 0;
  const complete = document !== null && document.title.trim() !== "" && Object.values(document.declarations).every(Boolean)
    && (hackathon ? hackathon.pitch.trim() !== "" && words <= 300 : thesis !== null && thesis.narrative.trim() !== "" && thesis.presenter.trim() !== "" && thesis.affiliation.trim() !== "");
  const fieldDisabled = pending || preview || locked || !entryOpen;
  const statusLabel = (status: string) => (copy.status as Record<string, string>)[status] ?? (status === "ineligible" ? copy.status.rejected : copy.status.submitted);
  return <div className="competition-workspace" data-testid="competition-workspace">
    <nav className="competition-kind-nav" aria-label={copy.title}>
      {(["hackathon", "three_minute_thesis"] as const).map((option) => <a key={option} href={`/${locale}/entries?kind=${option}`} aria-current={kind === option ? "page" : undefined}>{copy[option]}</a>)}
    </nav>
    <aside className="participant-account-card competition-guidance"><p>{kind === "hackathon" ? copy.guidance : copy.postgraduate}</p></aside>
    <section className="participant-account-card">
      <h2>{copy[kind]}</h2>
      {!entryOpen ? <p role="status">{copy.windowClosed}</p> : null}
      {!entries.length ? <p>{copy.empty}</p> : <ul className="competition-list">{entries.map((entry) => <li key={entry.id}>
        <div><strong lang="en" dir="ltr">{entry.document.title || copy.newDraft}</strong><span>{statusLabel(entry.status)}</span></div>
        <Button disabled={pending || dirty} variant="secondary" onClick={() => open(entry)}>{copy.edit}</Button>
      </li>)}</ul>}
      <Button disabled={pending || dirty || !entryOpen} onClick={() => open(null)}>{copy.create}</Button>
    </section>
    {document ? <section className="participant-account-card" data-testid="competition-editor">
      <h2>{current ? statusLabel(current.status) : copy.newDraft}</h2>
      <p className="competition-status" role="status" aria-live="polite">{pending ? copy.saving : message || (dirty ? copy.unsaved : current ? copy.saved : "")}</p>
      {message && !pending ? <Button disabled={pending} variant="secondary" onClick={() => void refresh()}>{copy.reload}</Button> : null}
      {locked ? <p>{copy.locked}</p> : preview ? <p>{copy.previewNote}</p> : null}
      {current?.outcome ? <aside className="competition-section"><h3>{copy.outcomeLabel}</h3><p lang="en" dir="ltr">{current.outcome}</p></aside> : null}
      <fieldset disabled={fieldDisabled} className="competition-fields">
        <legend>{copy.scientific}</legend>
        <label htmlFor="competition-title">{copy.titleField}<input id="competition-title" dir="ltr" lang="en" value={document.title} onChange={(event) => edit({ title: event.target.value })} /></label>
        {hackathon ? <>
          <label htmlFor="competition-mode"><span id="competition-mode-label">{copy.mode}</span><select id="competition-mode" aria-labelledby="competition-mode-label" value={hackathon.participationMode} disabled={(current?.roster.length ?? 1) > 1} onChange={(event) => edit({ participationMode: event.target.value as HackathonDocument["participationMode"] })}><option value="solo">{copy.solo}</option><option value="team">{copy.team}</option></select></label>
          <label htmlFor="competition-track"><span id="competition-track-label">{copy.track}</span><select id="competition-track" aria-labelledby="competition-track-label" dir="ltr" lang="en" value={hackathon.track} onChange={(event) => edit({ track: event.target.value as HackathonDocument["track"] })}>{Object.entries(HACKATHON_TRACKS).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
          {settings.pitchPrompt ? <p lang="en" dir="ltr">{settings.pitchPrompt}</p> : null}
          <label htmlFor="competition-pitch">{copy.pitch}<textarea id="competition-pitch" dir="ltr" lang="en" rows={8} value={hackathon.pitch} onChange={(event) => edit({ pitch: event.target.value })} aria-describedby="competition-words" /></label>
          <p id="competition-words" className={words > 300 ? "competition-word-count competition-error" : "competition-word-count"} data-testid="competition-word-count" aria-live="polite">{copy.words}: <bdi>{words} / 300</bdi></p>
        </> : thesis ? <>
          <label htmlFor="competition-narrative">{copy.narrative}<textarea id="competition-narrative" dir="ltr" lang="en" rows={8} value={thesis.narrative} onChange={(event) => edit({ narrative: event.target.value })} /></label>
          <label htmlFor="competition-presenter">{copy.presenter}<input id="competition-presenter" dir="ltr" lang="en" value={thesis.presenter} onChange={(event) => edit({ presenter: event.target.value })} /></label>
          <label htmlFor="competition-affiliation">{copy.affiliation}<input id="competition-affiliation" dir="ltr" lang="en" value={thesis.affiliation} onChange={(event) => edit({ affiliation: event.target.value })} /></label>
        </> : null}
      </fieldset>
      {words > 300 ? <p role="alert" className="competition-error">{copy.overLimit}</p> : null}
      <fieldset disabled={fieldDisabled} className="competition-fields"><legend>{copy.declarations}</legend>
        {hackathon ? originalityKeys.map((key) => <label key={key} className="competition-choice"><input type="checkbox" checked={hackathon.declarations[key]} onChange={(event) => edit({ declarations: { ...hackathon.declarations, [key]: event.target.checked } })} /><span>{copy[key]}</span></label>) : thesis ? <>
          <label className="competition-choice"><input type="checkbox" checked={thesis.declarations.postgraduate} onChange={(event) => edit({ declarations: { ...thesis.declarations, postgraduate: event.target.checked } })} /><span>{copy.postgraduateDeclaration}</span></label>
          <label className="competition-choice"><input type="checkbox" checked={thesis.declarations.authorityConfirmed} onChange={(event) => edit({ declarations: { ...thesis.declarations, authorityConfirmed: event.target.checked } })} /><span>{copy.authorityConfirmed}</span></label>
        </> : null}
      </fieldset>
      {!locked ? <div className="competition-actions">
        {preview ? <Button disabled={pending} variant="secondary" onClick={() => setPreview(false)}>{copy.editAgain}</Button> : <>
          <Button disabled={pending || !entryOpen || words > 300} onClick={() => void mutate("save")}>{copy.save}</Button>
          <Button disabled={pending || !entryOpen || words > 300} variant="secondary" onClick={() => void mutate("save", true)}>{copy.preview}</Button>
        </>}
        {preview ? <Button disabled={pending || dirty || !current || !entryOpen || !complete} onClick={() => void mutate("submit", true)}>{copy.submit}</Button> : null}
      </div> : null}
      {kind === "hackathon" ? <section className="competition-section">
        <h3>{copy.roster}</h3><p>{copy.rosterNote}</p>
        <ul className="competition-roster">{current?.roster.map((member) => <li key={member.id}><div><bdi>{member.email}</bdi><span>{member.isLead ? copy.leadLabel : copy.member} · {member.confirmed ? copy.confirmed : current.status === "accepted" ? copy.confirmationPending : copy.registered}</span></div></li>)}</ul>
        {hackathon?.participationMode === "team" ? <fieldset className="competition-fields" disabled={pending || dirty || !current || locked || !entryOpen || (current.roster.length >= 5)}>
          <label htmlFor="competition-invite-email">{copy.email}<input id="competition-invite-email" type="email" dir="ltr" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <Button disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} variant="secondary" onClick={() => void mutate("invite")}>{copy.invite}</Button>
        </fieldset> : null}
        {current?.status === "accepted" ? <><p>{copy.invitationNote}</p><Button disabled={pending || !membershipOpen} onClick={() => void mutate("confirm")}>{copy.confirm}</Button></> : null}
      </section> : null}
      <section className="competition-section"><h3>{copy.supporting}</h3><p>{copy.fileNote}</p>
        {current?.files.filter((file) => file.stage === "supporting").length ? <ul className="competition-files">{current.files.filter((file) => file.stage === "supporting").map((file) => <li key={file.id}><bdi>{file.name}</bdi><Button disabled={pending || dirty} variant="secondary" onClick={() => void fileAction("file_read", "supporting", null, file.id)} aria-label={`${copy.openFile}: ${file.name}`}>{copy.openFile}</Button></li>)}</ul> : <p>{copy.noFiles}</p>}
        {settings.filesReady && entryOpen && current && !locked ? <fieldset disabled={pending || dirty} className="competition-fields"><legend>{copy.upload}</legend><p>{copy.technicalFiles}</p>
          <label htmlFor="competition-supporting-file">{copy.fileChoose}<input id="competition-supporting-file" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setSupportingFile(event.target.files?.[0] ?? null)} /></label>
          <Button disabled={!supportingFile} onClick={() => void fileAction("file_reserve", "supporting", supportingFile)}>{copy.upload}</Button>
        </fieldset> : <p>{copy.uploadUnavailable}</p>}
      </section>
      <section className="competition-section"><h3>{copy.finalMaterial}</h3><p>{copy.finalNote}</p>
        {current?.files.filter((file) => file.stage === "final").length ? <ul className="competition-files">{current.files.filter((file) => file.stage === "final").map((file) => <li key={file.id}><bdi>{file.name}</bdi><Button disabled={pending || dirty} variant="secondary" onClick={() => void fileAction("file_read", "final", null, file.id)} aria-label={`${copy.openFile}: ${file.name}`}>{copy.openFile}</Button></li>)}</ul> : <p>{copy.noFiles}</p>}
        {settings.filesReady && settings.stageStates.final_material === "open" && current?.status === "accepted" ? <fieldset disabled={pending || dirty} className="competition-fields"><legend>{copy.upload}</legend><p>{copy.technicalFiles}</p>
          <label htmlFor="competition-final-file">{copy.fileChoose}<input id="competition-final-file" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFinalFile(event.target.files?.[0] ?? null)} /></label>
          <Button disabled={!finalFile} onClick={() => void fileAction("file_reserve", "final", finalFile)}>{copy.upload}</Button>
        </fieldset> : <p>{copy.uploadUnavailable}</p>}
      </section>
    </section> : null}
  </div>;
}
