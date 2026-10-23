"use client";

/* Private previews and revocable public images deliberately bypass the Next image cache. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/form-field";
import type { Locale } from "@/lib/i18n";
import { formatStaffNumber } from "./console-shell";
import { mediaCopy } from "./media-copy";
import { requestMedia, uploadMediaFile } from "./media-client";
import type { MediaAsset, MediaFields, MediaFilter, MediaPayload, MediaResponse, MediaTransition } from "./media-contract";

const maxUploadBytes = 10 * 1024 * 1024;
function fields(asset: MediaAsset): MediaFields {
  const { altEn, altAr, captionEn, captionAr, creditEn, creditAr, focalX, focalY, rightsConfirmed, rightsEvidence } = asset;
  return { altEn, altAr, captionEn, captionAr, creditEn, creditAr, focalX, focalY, rightsConfirmed, rightsEvidence };
}
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
function errorText(response: MediaResponse, locale: Locale) {
  const errors = mediaCopy[locale].errors;
  return response.state in errors ? errors[response.state as keyof typeof errors] : errors.unavailable;
}

function MediaDetails({ locale, asset, busy, onClose, act }: { locale: Locale; asset: MediaAsset; busy: boolean; onClose: () => void; act: (payload: MediaPayload, success: string) => Promise<boolean> }) {
  const text = mediaCopy[locale], [edit, setEdit] = useState<MediaFields>(() => fields(asset));
  const [confirmation, setConfirmation] = useState<{ action: MediaTransition; operationId: string } | null>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(edit) !== JSON.stringify(fields(asset));
  const disabled = busy || !!asset.busy || asset.state === "archived";
  const publishReady = !!edit.altEn.trim() && !!edit.altAr.trim() && edit.rightsConfirmed && !!edit.rightsEvidence.trim();
  const change = <K extends keyof MediaFields>(key: K, value: MediaFields[K]) => { setEdit((previous) => ({ ...previous, [key]: value })); setConfirmation(null); };
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (confirmation) confirmationHeading.current?.focus(); }, [confirmation]);
  function focalKey(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 1;
    const movement = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!movement) return;
    event.preventDefault();
    setEdit((previous) => ({ ...previous, focalX: clamp(previous.focalX + movement[0]), focalY: clamp(previous.focalY + movement[1]) }));
    setConfirmation(null);
  }
  const bilingualFields = [
    ["altEn", "media-alt-en", text.altEn, "en", "ltr", 500], ["altAr", "media-alt-ar", text.altAr, "ar", "rtl", 500],
    ["captionEn", "media-caption-en", text.captionEn, "en", "ltr", 2000], ["captionAr", "media-caption-ar", text.captionAr, "ar", "rtl", 2000],
    ["creditEn", "media-credit-en", text.creditEn, "en", "ltr", 500], ["creditAr", "media-credit-ar", text.creditAr, "ar", "rtl", 500],
  ] as const;
  return <section className="staff-panel staff-media-details" aria-label={text.details}>
    <div className="staff-detail-head"><h3 ref={heading} tabIndex={-1}>{text.details}</h3><Button size="small" variant="secondary" disabled={busy} onClick={onClose}>{text.close}</Button></div>
    <p className="staff-media-filename"><bdi>{asset.filename}</bdi> <span className="staff-status" data-state={asset.state}>{text.states[asset.state]}</span></p>
    <dl className="staff-media-facts"><div><dt>{text.dimensions}</dt><dd><bdi>{formatStaffNumber(asset.width, locale)} × {formatStaffNumber(asset.height, locale)}</bdi></dd></div><div><dt>{text.fileSize}</dt><dd><bdi>{new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { style: "unit", unit: "megabyte", maximumFractionDigits: 2 }).format(asset.size / 1024 / 1024)}</bdi></dd></div></dl>
    {asset.busy ? <p className="staff-note" role="status">{text.processingLocked}</p> : null}
    {asset.state === "archived" ? <p className="staff-note">{text.archiveReadOnly}</p> : null}
    <form onSubmit={(event) => { event.preventDefault(); void act({ action: "save", assetId: asset.id, version: asset.version, ...edit }, text.saved); }}>
      <fieldset className="staff-media-fields" disabled={disabled}><legend className="sr-only">{text.details}</legend>
        <p id="media-alt-hint" className="staff-muted">{text.altHint}</p>
        <div className="staff-media-language-fields">{bilingualFields.map(([key, id, label, lang, dir, maxLength]) => <div className="field" key={key}>
          <label className="field-label" htmlFor={id}>{label}</label>
          <textarea id={id} lang={lang} dir={dir} className="field-input" value={edit[key]} maxLength={maxLength} rows={key.startsWith("caption") ? 3 : 2} aria-describedby={key.startsWith("alt") ? "media-alt-hint" : undefined} onChange={(event) => change(key, event.target.value)} />
        </div>)}</div>
        <fieldset className="staff-media-focal"><legend>{text.focal}</legend><p id="media-focal-hint" className="staff-muted">{text.focalHint}</p>
          <button type="button" className="staff-media-focal-image" aria-label={text.focalChoose} aria-describedby="media-focal-hint" onKeyDown={focalKey} onClick={(event) => {
            if (!event.detail) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setEdit((previous) => ({ ...previous, focalX: clamp((event.clientX - bounds.left) / bounds.width * 100), focalY: clamp((event.clientY - bounds.top) / bounds.height * 100) })); setConfirmation(null);
          }}><img src={asset.previewUrl} alt="" width={asset.width} height={asset.height} draggable={false} /><span className="staff-media-focal-point" style={{ left: `${edit.focalX}%`, top: `${edit.focalY}%` }} aria-hidden="true" /></button>
          <div className="staff-media-focal-sliders">{(["x", "y"] as const).map((axis) => <div className="field" key={axis}><label className="field-label" htmlFor={`media-focal-${axis}`}>{axis === "x" ? text.horizontal : text.vertical}: {formatStaffNumber(edit[axis === "x" ? "focalX" : "focalY"], locale)}%</label><input id={`media-focal-${axis}`} type="range" min={0} max={100} step={1} dir="ltr" value={edit[axis === "x" ? "focalX" : "focalY"]} onChange={(event) => change(axis === "x" ? "focalX" : "focalY", Number(event.target.value))} /></div>)}</div>
          <Button size="small" variant="secondary" onClick={() => { setEdit((previous) => ({ ...previous, focalX: 50, focalY: 50 })); setConfirmation(null); }}>{text.resetFocal}</Button>
          <figure className="staff-media-crop"><img src={asset.previewUrl} alt="" width={asset.width} height={asset.height} style={{ objectPosition: `${edit.focalX}% ${edit.focalY}%` }} /><figcaption>{text.cropPreview}</figcaption></figure>
        </fieldset>
        <fieldset className="staff-media-rights"><legend>{text.rights}</legend><label className="staff-media-checkbox" htmlFor="media-rights-confirmed"><input id="media-rights-confirmed" type="checkbox" checked={edit.rightsConfirmed} onChange={(event) => change("rightsConfirmed", event.target.checked)} /><span>{text.rightsConfirmed}</span></label>
          <div className="field"><label className="field-label" htmlFor="media-rights-evidence">{text.rightsEvidence}</label><p className="field-hint" id="media-rights-hint">{text.rightsHint}</p><textarea id="media-rights-evidence" className="field-input" rows={3} maxLength={2000} value={edit.rightsEvidence} aria-describedby="media-rights-hint" onChange={(event) => change("rightsEvidence", event.target.value)} /></div>
        </fieldset>
      </fieldset>
      {dirty ? <p className="staff-note">{text.unsaved}</p> : null}
      <Button type="submit" disabled={disabled || !dirty}>{text.save}</Button>
    </form>
    <div className="staff-media-state-actions"><div className="staff-actions">
      {asset.state === "draft" ? <Button disabled={disabled || dirty || !publishReady} aria-describedby={!publishReady ? "media-publish-blocked" : undefined} onClick={() => setConfirmation({ action: "publish", operationId: crypto.randomUUID() })}>{text.publish}</Button> : null}
      {asset.state === "published" ? <Button variant="secondary" disabled={disabled || dirty} onClick={() => setConfirmation({ action: "unpublish", operationId: crypto.randomUUID() })}>{text.unpublish}</Button> : null}
      {asset.state !== "archived" ? <Button variant="secondary" disabled={disabled || dirty} onClick={() => setConfirmation({ action: "archive", operationId: crypto.randomUUID() })}>{text.archive}</Button> : null}
    </div>{asset.state === "draft" && !publishReady ? <p className="staff-muted" id="media-publish-blocked">{text.publishBlocked}</p> : null}</div>
    {confirmation ? <div className="staff-media-confirmation" role="group" aria-label={text.confirmations[confirmation.action]}><h4 ref={confirmationHeading} tabIndex={-1}>{text.confirmations[confirmation.action]}</h4><div className="staff-actions"><Button disabled={disabled} onClick={() => { void act({ action: confirmation.action, assetId: asset.id, version: asset.version, operationId: confirmation.operationId }, text[confirmation.action === "publish" ? "published" : confirmation.action === "unpublish" ? "unpublished" : "archived"]).then((success) => { if (success) setConfirmation(null); }); }}>{text.confirm} {text[confirmation.action]}</Button><Button variant="secondary" disabled={busy} onClick={() => { setConfirmation(null); heading.current?.focus(); }}>{text.cancel}</Button></div></div> : null}
  </section>;
}

export function MediaLibraryPanel({ locale }: { locale: Locale }) {
  const text = mediaCopy[locale];
  const [assets, setAssets] = useState<MediaAsset[]>([]), [total, setTotal] = useState(0), [selected, setSelected] = useState<MediaAsset | null>(null);
  const [query, setQuery] = useState(""), [filter, setFilter] = useState<MediaFilter>("all"), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false), [message, setMessage] = useState(""), [failure, setFailure] = useState(false);
  const [progress, setProgress] = useState<number | null>(null), [processing, setProcessing] = useState(false), [dragging, setDragging] = useState(false);
  const formToken = useRef<string | undefined>(undefined), active = useRef(true), lock = useRef(false), pending = useRef<AbortController | null>(null), upload = useRef<AbortController | null>(null);
  const search = useRef({ query: "", filter: "all" as MediaFilter }), feedback = useRef<HTMLParagraphElement>(null), uploadInput = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLButtonElement | null>(null);
  const load = useCallback(async (clearMessage = true) => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); if (clearMessage) { setMessage(""); setFailure(false); }
    const response = await requestMedia(undefined, { query: search.current.query, state: search.current.filter, signal: controller.signal });
    if (!active.current || controller.signal.aborted) return;
    if (response.formToken) formToken.current = response.formToken;
    if (response.state === "ready") { setReady(true); setAssets(response.assets ?? []); setTotal(response.total ?? response.assets?.length ?? 0); }
    else { setReady(false); setAssets([]); setSelected(null); setMessage(errorText(response, locale)); setFailure(true); }
    setLoading(false);
  }, [locale]);
  useEffect(() => { active.current = true; const start = window.setTimeout(() => void load(), 0); return () => { active.current = false; window.clearTimeout(start); pending.current?.abort(); upload.current?.abort(); }; }, [load]);
  useEffect(() => { if (failure && message) feedback.current?.focus(); }, [failure, message]);
  async function act(payload: MediaPayload, success: string) {
    if (lock.current || !formToken.current) return false;
    lock.current = true; pending.current?.abort(); setBusy(true); setMessage(""); setFailure(false);
    const response = await requestMedia({ ...payload, formToken: formToken.current });
    if (!active.current) return false;
    if (response.formToken) formToken.current = response.formToken;
    const done = response.state === "ready" || response.state === "updated";
    if (done) { if (response.asset) setSelected(response.asset); else setSelected(null); setMessage(success); await load(false); }
    else { setMessage(errorText(response, locale)); setFailure(true); }
    lock.current = false; setBusy(false); return done;
  }
  async function receive(file: File | undefined) {
    if (!file || lock.current || !ready || !formToken.current) return;
    if (file.size > maxUploadBytes || !file.size) { setFailure(true); setMessage(file.size > maxUploadBytes ? text.errors["upload-too-large"] : text.errors["upload-invalid"]); return; }
    lock.current = true; pending.current?.abort(); setBusy(true); setProgress(0); setProcessing(false); setMessage(""); setFailure(false);
    const controller = new AbortController(); upload.current = controller;
    let response = await requestMedia({ action: "upload-url", filename: file.name, size: file.size, formToken: formToken.current }, { signal: controller.signal });
    if (response.formToken) formToken.current = response.formToken;
    if (response.state === "ready" && response.signedUrl && response.uploadId) {
      const transferred = await uploadMediaFile(file, response.signedUrl, (value) => { if (active.current) setProgress(value); }, controller.signal);
      if (transferred && active.current) { setProgress(100); setProcessing(true); response = await requestMedia({ action: "complete-upload", uploadId: response.uploadId, formToken: formToken.current }, { signal: controller.signal }); }
      else response = { state: "unavailable" };
    }
    if (!active.current || controller.signal.aborted) return;
    if (response.formToken) formToken.current = response.formToken;
    if ((response.state === "ready" || response.state === "updated") && response.asset) { setSelected(response.asset); setMessage(response.duplicate ? text.duplicate : text.uploaded); await load(false); }
    else { setFailure(true); setMessage(errorText(response, locale)); }
    lock.current = false; setBusy(false); setProgress(null); setProcessing(false);
  }
  return <div className="staff-media-library" data-testid="media-library">
    <section className="staff-panel" aria-labelledby="media-library-title"><h2 id="media-library-title">{text.title}</h2><p>{text.intro}</p><p className="staff-muted">{text.contentPending}</p>
      <div className="staff-media-drop" data-dragging={dragging || undefined} onDragOver={(event) => { event.preventDefault(); if (!busy && ready) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) void receive(event.dataTransfer.files[0]); }}>
        <p>{text.drop}</p><p className="staff-muted" id="media-upload-hint">{text.uploadHint}</p>
        <label className="field-label" htmlFor="media-upload">{text.upload}</label><input ref={uploadInput} id="media-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-describedby="media-upload-hint" disabled={busy || !ready} onChange={(event) => { void receive(event.target.files?.[0]); event.target.value = ""; }} />
        {progress !== null ? <div className="staff-media-upload-progress" role="status"><label htmlFor="media-progress">{processing ? text.processing : `${text.uploading} · ${formatStaffNumber(progress, locale)}%`}</label><progress id="media-progress" max={100} value={processing ? undefined : progress} /></div> : null}
      </div>
    </section>
    <p className={message ? "staff-feedback" : "staff-feedback staff-feedback--empty"} role={failure ? "alert" : "status"} ref={feedback} tabIndex={-1}>{message}</p>
    {!ready && !loading || failure ? <Button variant="secondary" disabled={busy || loading} onClick={() => { setSelected(null); void load(); }}>{text.retry}</Button> : null}
    <section className="staff-panel" aria-label={text.title}><form className="staff-search staff-media-search" onSubmit={(event) => { event.preventDefault(); search.current = { query, filter }; setSelected(null); void load(); }}>
      <FormField id="media-search" type="search" label={text.search} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} disabled={busy || loading} />
      <div className="field"><label className="field-label" htmlFor="media-state">{text.filter}</label><select id="media-state" className="field-input" value={filter} disabled={busy || loading} onChange={(event) => { const next = event.target.value as MediaFilter; setFilter(next); search.current = { query, filter: next }; setSelected(null); void load(); }}><option value="all">{text.all}</option>{(["draft", "published", "archived"] as const).map((state) => <option key={state} value={state}>{text.states[state]}</option>)}</select></div><Button type="submit" disabled={busy || loading}>{text.searchAction}</Button>
    </form><p className="staff-muted">{text.count}: {formatStaffNumber(total, locale)}. {text.resultsLimit}</p>
      {loading ? <p role="status">{text.loading}</p> : !assets.length ? <p>{text.empty}</p> : <ul className="staff-media-grid">{assets.map((asset) => <li key={asset.id}><button type="button" className="staff-media-card" aria-label={`${text.open}: ${asset.filename}`} aria-pressed={selected?.id === asset.id} disabled={busy} onClick={(event) => { restoreFocus.current = event.currentTarget; setSelected(asset); }}><img src={asset.previewUrl} alt="" width={asset.width} height={asset.height} loading="lazy" style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} /><span className="staff-media-card-meta"><bdi>{asset.filename}</bdi><span className="staff-status" data-state={asset.state}>{text.states[asset.state]}</span></span></button></li>)}</ul>}
    </section>
    {selected ? <MediaDetails key={`${selected.id}:${selected.version}`} locale={locale} asset={selected} busy={busy} act={act} onClose={() => { setSelected(null); restoreFocus.current?.focus(); }} /> : null}
  </div>;
}
