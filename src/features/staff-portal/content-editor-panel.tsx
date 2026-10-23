"use client";
/* Revocable media must not enter the public Next image optimizer cache. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { formatStaffNumber } from "./console-shell";
import { CONTENT_COLLECTIONS, contentPublishIssue, emptyContentFields, type ContentCollection, type ContentFields, type ContentItem, type ContentPayload, type ContentResponse, type ContentRevision } from "./content-contract";
import { requestContent } from "./content-client";
import { contentCopy } from "./content-editor-copy";
import { MediaPicker } from "./media-picker";
import { requestMedia } from "./media-client";
import type { MediaAsset } from "./media-contract";

type BilingualField = "name" | "title" | "affiliation" | "bio" | "description" | "group" | "room";
const collectionFields: Record<ContentCollection, readonly BilingualField[]> = {
  speakers: ["name", "title", "affiliation", "bio"], sessions: ["title", "description", "room"], partners: ["name"], team: ["name", "title", "group", "description"],
};
function label(item: ContentItem, locale: Locale) { return (item.collection === "sessions" ? item.draft[locale === "ar" ? "titleAr" : "titleEn"] : item.draft[locale === "ar" ? "nameAr" : "nameEn"]) || contentCopy[locale].untitled; }
function errorText(response: ContentResponse, locale: Locale) { const errors = contentCopy[locale].errors; return response.state in errors ? errors[response.state as keyof typeof errors] : errors.unavailable; }
type Action = (payload: ContentPayload, success: string) => Promise<boolean>;

function PublishConfirmation({ locale, action, busy, onCancel, onConfirm }: { locale: Locale; action: "publish" | "unpublish"; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), text = contentCopy[locale];
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="staff-content-confirmation" aria-labelledby="content-confirm-title" aria-describedby="content-confirm-description" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h3 id="content-confirm-title">{text.confirmations[action]}</h3><p id="content-confirm-description">{action === "publish" ? text.confirmPublish : text.confirmUnpublish}</p>
    <div className="staff-actions"><Button disabled={busy} onClick={onConfirm}>{text.confirm} {text[action]}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>{text.cancel}</Button></div>
  </dialog>;
}

function CardPreview({ locale, collection, fields, asset }: { locale: Locale; collection: ContentCollection; fields: ContentFields; asset: MediaAsset | null }) {
  const text = contentCopy[locale], name = fields[locale === "ar" ? "nameAr" : "nameEn"], title = fields[locale === "ar" ? "titleAr" : "titleEn"];
  const detail = fields[locale === "ar" ? "descriptionAr" : "descriptionEn"] || fields[locale === "ar" ? "bioAr" : "bioEn"];
  return <section className="staff-content-preview" aria-label={`${text.preview} — ${locale === "ar" ? "العربية" : "English"}`} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    {asset ? <img src={asset.previewUrl} alt={locale === "ar" ? asset.altAr : asset.altEn} width={asset.width} height={asset.height} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} /> : null}
    <h4>{(collection === "sessions" ? title : name) || text.untitled}</h4>
    {collection !== "sessions" && title ? <p className="staff-content-preview-role">{title}</p> : null}
    {fields[locale === "ar" ? "affiliationAr" : "affiliationEn"] ? <p>{fields[locale === "ar" ? "affiliationAr" : "affiliationEn"]}</p> : null}
    {fields[locale === "ar" ? "groupAr" : "groupEn"] ? <p>{fields[locale === "ar" ? "groupAr" : "groupEn"]}</p> : null}
    {collection === "sessions" ? <p><bdi>{fields.day} {fields.startTime}{fields.endTime ? ` – ${fields.endTime}` : ""}</bdi> {fields[locale === "ar" ? "roomAr" : "roomEn"]}</p> : null}
    {detail ? <p>{detail}</p> : null}
    {fields.url ? <p><bdi>{fields.url}</bdi></p> : null}
  </section>;
}

function ContentDetails({ locale, collection, item, busy, act, onClose, onDirty, onToken }: { locale: Locale; collection: ContentCollection; item: ContentItem | null; busy: boolean; act: Action; onClose: () => void; onDirty: (dirty: boolean) => void; onToken: (token: string) => void }) {
  const text = contentCopy[locale], [edit, setEdit] = useState<ContentFields>(() => item?.draft ?? emptyContentFields());
  const [asset, setAsset] = useState<MediaAsset | null>(null), [speakers, setSpeakers] = useState<ContentItem[]>([]), [speakerError, setSpeakerError] = useState("");
  const [history, setHistory] = useState<ContentRevision[] | null>(null), [historyBusy, setHistoryBusy] = useState(false), [historyError, setHistoryError] = useState("");
  const [confirmation, setConfirmation] = useState<"publish" | "unpublish" | null>(null);
  const heading = useRef<HTMLHeadingElement>(null), active = useRef(true), historyPending = useRef<AbortController | null>(null);
  const initial = item?.draft ?? emptyContentFields(), dirty = JSON.stringify(edit) !== JSON.stringify(initial), issue = contentPublishIssue(collection, edit);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => { heading.current?.focus(); active.current = true; return () => { active.current = false; historyPending.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (item?.draft.assetId) void requestMedia(undefined, { state: "published", signal: controller.signal }).then((response) => { if (!controller.signal.aborted) setAsset(response.assets?.find((entry) => entry.id === item.draft.assetId) ?? null); });
    if (collection === "sessions") void requestContent(undefined, { collection: "speakers", signal: controller.signal }).then((response) => { if (!controller.signal.aborted) { setSpeakers(response.items ?? []); if (response.state !== "ready") setSpeakerError(errorText(response, locale)); } });
    return () => controller.abort();
  }, [collection, item?.draft.assetId, locale]);
  function change<K extends keyof ContentFields>(key: K, value: ContentFields[K]) { setEdit((previous) => ({ ...previous, [key]: value })); setConfirmation(null); }
  async function loadHistory() {
    if (!item || historyBusy) return;
    const controller = new AbortController(); historyPending.current = controller;
    setHistoryBusy(true); setHistoryError("");
    const response = await requestContent(undefined, { itemId: item.id, signal: controller.signal });
    if (!active.current || controller.signal.aborted) return;
    if (response.formToken) onToken(response.formToken);
    if (response.state === "ready") setHistory(response.history ?? []); else setHistoryError(errorText(response, locale));
    setHistoryBusy(false);
  }
  const sharedFields = collection === "sessions" ? ["day", "startTime", "endTime"] as const : collection === "partners" || collection === "team" ? ["url"] as const : [];
  return <section className="staff-panel staff-content-details" aria-label={text.details}>
    <div className="staff-detail-head"><h3 ref={heading} tabIndex={-1}>{text.details}</h3><Button variant="secondary" size="small" disabled={busy} onClick={onClose}>{text.close}</Button></div>
    {item ? <p className="staff-muted">{text.version} {formatStaffNumber(item.version, locale)} · {item.publishedVersion ? `${text.published} ${formatStaffNumber(item.publishedVersion, locale)}` : text.draft}</p> : null}
    {item?.publishedVersion ? <p className="staff-note">{text.publishedChanges}</p> : null}
    <form onSubmit={(event) => { event.preventDefault(); void act({ action: "save", collection, itemId: item?.id ?? null, version: item?.version ?? 0, fields: edit }, text.saved); }}>
      <fieldset className="staff-content-fields" disabled={busy || historyBusy}><legend className="sr-only">{text.details}</legend>
        <div className="staff-content-languages">{(["en", "ar"] as const).map((language) => <fieldset key={language} className="staff-content-language"><legend>{language === "ar" ? text.arabic : text.english}</legend>
          {collectionFields[collection].map((field) => { const key = `${field}${language === "ar" ? "Ar" : "En"}` as `${BilingualField}${"En" | "Ar"}`; return <div className="field" key={key}>
            <label className="field-label" htmlFor={`content-${key}`}>{text[key]}</label>
            <textarea id={`content-${key}`} className="field-input" value={edit[key]} dir={language === "ar" ? "rtl" : "ltr"} lang={language} rows={field === "bio" || field === "description" ? 5 : 2} maxLength={field === "bio" || field === "description" ? 6000 : 500} onChange={(event) => change(key, event.target.value)} />
          </div>; })}
        </fieldset>)}</div>
        {collection === "sessions" ? <p className="staff-muted">{text.timeHint}</p> : null}
        <div className="staff-content-shared">{sharedFields.map((field) => <div className="field" key={field}><label className="field-label" htmlFor={`content-${field}`}>{text[field]}</label><input id={`content-${field}`} className="field-input" type={field === "day" ? "date" : field === "url" ? "url" : "time"} dir="ltr" value={edit[field]} maxLength={field === "url" ? 2000 : undefined} onChange={(event) => change(field, event.target.value)} /></div>)}
          {collection === "sessions" || collection === "partners" ? <div className="field"><label className="field-label" htmlFor="content-category">{collection === "sessions" ? text.type : text.tier}</label><select id="content-category" className="field-input" value={collection === "sessions" ? edit.type : edit.tier} onChange={(event) => change(collection === "sessions" ? "type" : "tier", event.target.value)}><option value="">—</option>{Object.entries(collection === "sessions" ? text.types : text.tiers).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div> : null}
        </div>
        {collection === "speakers" ? <div className="field"><label className="field-label" htmlFor="content-links">{text.links}</label><textarea id="content-links" className="field-input" rows={3} dir="ltr" value={edit.links.join("\n")} onChange={(event) => change("links", event.target.value.split("\n"))} /></div> : null}
        {collection === "sessions" ? <fieldset className="staff-content-speakers"><legend>{text.speakers}</legend>{speakerError ? <p role="alert">{speakerError}</p> : !speakers.length ? <p>{text.noSpeakers}</p> : speakers.map((speaker) => <label className="staff-media-checkbox" key={speaker.id}><input type="checkbox" checked={edit.speakerIds.includes(speaker.id)} onChange={(event) => change("speakerIds", event.target.checked ? [...edit.speakerIds, speaker.id] : edit.speakerIds.filter((id) => id !== speaker.id))} /><span>{label(speaker, locale)}{speaker.publishedVersion ? "" : ` · ${text.draft}`}</span></label>)}</fieldset> : null}
        {collection === "partners" ? <label className="staff-media-checkbox staff-content-permission"><input type="checkbox" checked={edit.permissionToDisplay} onChange={(event) => change("permissionToDisplay", event.target.checked)} /><span>{text.permission}</span></label> : null}
        {collection !== "sessions" ? <fieldset className="staff-content-image"><legend>{text.image}</legend><p>{text.imageHint}</p><p>{edit.assetId ? `${text.selectedImage}${asset ? `: ${locale === "ar" ? asset.altAr : asset.altEn}` : ""}` : text.noImage}</p>{edit.assetId ? <Button variant="secondary" size="small" onClick={() => { change("assetId", null); setAsset(null); }}>{text.clearImage}</Button> : null}<MediaPicker locale={locale} value={edit.assetId} disabled={busy} onChoose={(chosen) => { change("assetId", chosen.id); setAsset(chosen); }} /></fieldset> : null}
      </fieldset>
      {dirty ? <p className="staff-note">{text.unsaved}</p> : null}<Button type="submit" disabled={busy || historyBusy || (!dirty && !!item)}>{text.save}</Button>
    </form>
    <section className="staff-content-previews" aria-label={text.preview}><h3>{text.preview}</h3><p className="staff-muted">{text.previewHint}</p><div className="staff-content-languages">{(["en", "ar"] as const).map((language) => <CardPreview key={language} locale={language} collection={collection} fields={edit} asset={asset} />)}</div></section>
    {item ? <><div className="staff-content-publish"><div className="staff-actions"><Button disabled={busy || historyBusy || dirty || !!issue} aria-describedby={issue ? "content-publish-hint" : undefined} onClick={() => setConfirmation("publish")}>{text.publish}</Button>{item.publishedVersion ? <Button variant="secondary" disabled={busy || historyBusy || dirty} onClick={() => setConfirmation("unpublish")}>{text.unpublish}</Button> : null}</div>{issue ? <p id="content-publish-hint" className="staff-muted">{issue in text.errors ? text.errors[issue as keyof typeof text.errors] : text.publishBlocked}</p> : null}</div>
      <section className="staff-content-history" aria-label={text.history}><h3>{text.history}</h3><p className="staff-muted">{text.historyHint}</p><Button variant="secondary" disabled={busy || historyBusy} onClick={() => void loadHistory()}>{text.loadHistory}</Button>{historyError ? <p role="alert">{historyError}</p> : null}{historyBusy ? <p role="status">{text.loading}</p> : history ? !history.length ? <p>{text.historyEmpty}</p> : <ol>{history.map((revision) => <li key={revision.version}><span>{formatStaffNumber(revision.version, locale)} · {revision.action in text.actions ? text.actions[revision.action as keyof typeof text.actions] : text.version}</span><time dateTime={revision.createdAt}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(new Date(revision.createdAt))}</time><Button size="small" variant="secondary" disabled={busy || dirty} onClick={() => void act({ action: "restore", itemId: item.id, version: item.version, restoreVersion: revision.version }, text.restored)}>{text.restore} {formatStaffNumber(revision.version, locale)}</Button></li>)}</ol> : null}</section>
      {confirmation ? <PublishConfirmation locale={locale} action={confirmation} busy={busy} onCancel={() => setConfirmation(null)} onConfirm={() => { void act({ action: confirmation, itemId: item.id, version: item.version, confirmed: true }, confirmation === "publish" ? text.publishedSuccess : text.unpublishedSuccess).then(() => setConfirmation(null)); }} /> : null}
    </> : null}
  </section>;
}

export function ContentEditorPanel({ locale }: { locale: Locale }) {
  const text = contentCopy[locale], [collection, setCollection] = useState<ContentCollection>("speakers"), [items, setItems] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null | undefined>(undefined), [dirty, setDirty] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  const [message, setMessage] = useState(""), [failure, setFailure] = useState(false);
  const active = useRef(true), lock = useRef(false), pending = useRef<AbortController | null>(null), formToken = useRef<string | undefined>(undefined), dragged = useRef<string | null>(null), feedback = useRef<HTMLParagraphElement>(null), opener = useRef<HTMLButtonElement | null>(null), panel = useRef<HTMLDivElement>(null);
  const load = useCallback(async (clearMessage = true) => {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setLoading(true); if (clearMessage) { setMessage(""); setFailure(false); }
    const response = await requestContent(undefined, { collection, signal: controller.signal });
    if (!active.current || controller.signal.aborted) return;
    if (response.formToken) formToken.current = response.formToken;
    if (response.state === "ready") { setItems(response.items ?? []); setReady(true); }
    else { setItems([]); setReady(false); setMessage(errorText(response, locale)); setFailure(true); }
    setLoading(false);
  }, [collection, locale]);
  useEffect(() => { active.current = true; const start = window.setTimeout(() => void load(), 0); return () => { active.current = false; window.clearTimeout(start); pending.current?.abort(); }; }, [load]);
  useEffect(() => { if (failure && message) feedback.current?.focus(); }, [failure, message]);
  async function act(payload: ContentPayload, success: string) {
    if (lock.current || !formToken.current) return false;
    lock.current = true; pending.current?.abort(); setBusy(true); setMessage(""); setFailure(false);
    const response = await requestContent({ ...payload, ...(payload.action === "save" ? { fields: { ...payload.fields, links: payload.fields.links.map((link) => link.trim()).filter(Boolean) } } : {}), formToken: formToken.current });
    if (!active.current) return false;
    if (response.formToken) formToken.current = response.formToken;
    const done = response.state === "updated" || response.state === "ready";
    if (done) { if (response.item) { setSelected(response.item); setDirty(false); } else if (payload.action === "reorder") { setSelected(undefined); setDirty(false); } setMessage(success); await load(false); }
    else { setMessage(errorText(response, locale)); setFailure(true); }
    lock.current = false; setBusy(false); return done;
  }
  function reorder(from: number, to: number) {
    if (busy || dirty || from === to || to < 0 || to >= items.length) return;
    const next = [...items], [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    void act({ action: "reorder", collection, items: next.map(({ id, version }) => ({ id, version })) }, `${text.moved} ${label(moved, locale)} · ${text.order}: ${formatStaffNumber(to + 1, locale)}`).then((done) => {
      if (done) window.requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>(`[data-content-id="${moved.id}"] .staff-content-open`)?.focus());
    });
  }
  return <div className="staff-content-editor" data-testid="content-editor" ref={panel}>
    <section className="staff-panel" aria-labelledby="content-editor-title"><h2 id="content-editor-title">{text.title}</h2><p>{text.intro}</p><p className="staff-muted">{text.fallback}</p><div className="staff-content-toolbar"><div className="field"><label className="field-label" htmlFor="content-collection">{text.collection}</label><select id="content-collection" className="field-input" value={collection} disabled={busy || loading || dirty} onChange={(event) => { setCollection(event.target.value as ContentCollection); setSelected(undefined); setDirty(false); }} >{CONTENT_COLLECTIONS.map((key) => <option key={key} value={key}>{text.collections[key]}</option>)}</select></div><Button disabled={busy || loading || !ready || dirty} onClick={(event) => { opener.current = event.currentTarget; setSelected(null); }}>{text.create}</Button></div></section>
    <p className={message ? "staff-feedback" : "staff-feedback staff-feedback--empty"} role={failure ? "alert" : "status"} ref={feedback} tabIndex={-1}>{message}</p>
    {failure ? <Button variant="secondary" disabled={busy || loading} onClick={() => { setSelected(undefined); setDirty(false); void load(); }}>{text.retry}</Button> : null}
    <section className="staff-panel" aria-label={text.collections[collection]}>{loading ? <p role="status">{text.loading}</p> : ready && !items.length ? <p>{text.empty}</p> : ready ? <><p className="staff-muted">{text.orderHint}</p><ol className="staff-content-list">{items.map((item, index) => <li key={item.id} draggable={!busy && !dirty} data-content-id={item.id} onDragStart={(event) => { dragged.current = item.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }} onDragEnd={() => { dragged.current = null; }} onDragOver={(event) => { if (!busy && !dirty) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); const from = items.findIndex((entry) => entry.id === dragged.current); dragged.current = null; if (from >= 0) reorder(from, index); }}><span className="staff-content-position" aria-hidden="true">{formatStaffNumber(index + 1, locale)}</span><button className="staff-content-open" type="button" disabled={busy || dirty} aria-label={`${text.edit}: ${label(item, locale)}`} onClick={(event) => { opener.current = event.currentTarget; setSelected(item); }}><strong>{label(item, locale)}</strong><span className="staff-muted">{item.publishedVersion ? `${text.published} ${formatStaffNumber(item.publishedVersion, locale)}` : text.draft}</span></button><div className="staff-content-order"><Button variant="secondary" size="small" disabled={busy || dirty || index === 0} aria-label={`${text.up}: ${label(item, locale)}`} onClick={() => reorder(index, index - 1)}>↑<span className="sr-only">{text.up}</span></Button><Button variant="secondary" size="small" disabled={busy || dirty || index === items.length - 1} aria-label={`${text.down}: ${label(item, locale)}`} onClick={() => reorder(index, index + 1)}>↓<span className="sr-only">{text.down}</span></Button></div></li>)}</ol></> : null}</section>
    {selected !== undefined ? <ContentDetails key={selected ? `${selected.id}:${selected.version}` : `new:${collection}`} locale={locale} collection={collection} item={selected} busy={busy} act={act} onDirty={setDirty} onToken={(token) => { formToken.current = token; }} onClose={() => { setSelected(undefined); setDirty(false); opener.current?.focus(); }} /> : null}
  </div>;
}
