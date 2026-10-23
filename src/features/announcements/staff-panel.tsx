"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { formatStaffDate, formatStaffNumber } from "@/features/staff-portal/console-shell";
import { decodeAnnouncementFields, type Announcement, type AnnouncementFields, type AnnouncementPayload, type AnnouncementPreview, type AnnouncementResponse, type AnnouncementSegment } from "./contracts";
import { announcementCopy } from "./staff-copy";
import { requestAnnouncements } from "./staff-client";

const empty = (): AnnouncementFields => ({ subjectEn: "", subjectAr: "", bodyEn: "", bodyAr: "", segments: [] });
const fieldsOf = (row: Announcement): AnnouncementFields => ({ subjectEn: row.subjectEn, subjectAr: row.subjectAr, bodyEn: row.bodyEn, bodyAr: row.bodyAr, segments: row.segments });
function message(response: AnnouncementResponse, locale: Locale) { const errors = announcementCopy[locale].errors; return response.state in errors ? errors[response.state as keyof typeof errors] : errors.unavailable; }

function Confirmation({ locale, preview, scheduledAt, cancel, busy, error, onClose, onConfirm }: { locale: Locale; preview: AnnouncementPreview | null; scheduledAt: string; cancel: boolean; busy: boolean; error: string; onClose: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), text = announcementCopy[locale];
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="staff-content-confirmation staff-announcement-confirm" aria-labelledby="announcement-confirm-title" aria-describedby="announcement-confirm-description" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h3 id="announcement-confirm-title">{cancel ? text.confirmCancel : text.confirmTitle}</h3>
    <p id="announcement-confirm-description">{cancel ? text.cancelHint : text.exactCount}</p>
    {error ? <p role="alert">{error}</p> : null}
    {preview && !cancel ? <><p className="staff-announcement-total">{text.confirmCount}: <strong data-testid="announcement-recipient-total">{formatStaffNumber(preview.total, locale)}</strong></p>
      <h4>{text.segmentCounts}</h4><dl className="staff-metrics">{preview.segments.map((entry) => <div key={entry.segment}><dt>{text.segments[entry.segment]}</dt><dd>{formatStaffNumber(entry.count, locale)}</dd></div>)}</dl>
      {preview.samples.length ? <><h4>{text.samples}</h4><ul>{preview.samples.map((sample, index) => <li key={index}><bdi>{sample}</bdi></li>)}</ul></> : null}
      {scheduledAt ? <p>{text.scheduledFor}: <bdi>{scheduledAt.replace("T", " ")} (Asia/Riyadh)</bdi></p> : null}<p className="staff-note">{text.draftNote}</p></> : null}
    <div className="staff-actions"><Button disabled={busy || !cancel && preview?.total === 0} onClick={onConfirm}>{cancel ? text.cancel : scheduledAt ? text.scheduleSend : text.send}</Button><Button variant="secondary" disabled={busy} onClick={onClose}>{text.close}</Button></div>
  </dialog>;
}

/** Same structured preview frame as the existing email previews; authored text is React-escaped. */
function LiveEmail({ locale, fields, rendered }: { locale: Locale; fields: AnnouncementFields; rendered?: AnnouncementResponse["rendered"] }) {
  const text = announcementCopy[locale];
  return <section className="staff-panel staff-email-preview" aria-labelledby="announcement-email-preview"><h3 id="announcement-email-preview">{text.previewEmail}</h3><p className="staff-muted">{text.previewHint}</p>
    <div className="staff-email-message" data-testid="announcement-email-preview">
      <Image src="/brand/email-banner.png" alt="MSRC 2026 conference audience — previous edition" width={600} height={338} unoptimized className="staff-email-banner" />
      <div className="staff-email-message-body">{(["en", "ar"] as const).map((language, index) => <div key={language}>{index ? <hr /> : null}<div lang={language} dir={language === "ar" ? "rtl" : "ltr"} className={language === "ar" ? "staff-email-arabic" : undefined}>
        <p><strong>{fields[language === "ar" ? "subjectAr" : "subjectEn"]}</strong></p>{fields[language === "ar" ? "bodyAr" : "bodyEn"].replace(/\r\n?/g, "\n").split(/\n[\t ]*\n/).map((paragraph, n) => <p className="staff-announcement-paragraph" key={n}>{paragraph}</p>)}
      </div></div>)}</div>
    </div>
    {rendered ? <><details className="staff-history"><summary>{text.previewText}</summary><pre dir="ltr" className="staff-email-text">{rendered.text}</pre></details><details className="staff-history"><summary>{text.previewSource}</summary><pre dir="ltr" lang="en" className="staff-email-text staff-email-source"><code>{rendered.html}</code></pre></details></> : <p className="staff-muted">{text.renderPending}</p>}
  </section>;
}

export function AnnouncementsPanel({ locale }: { locale: Locale }) {
  const text = announcementCopy[locale], [rows, setRows] = useState<Announcement[]>([]), [segments, setSegments] = useState<AnnouncementSegment[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null), [fields, setFields] = useState<AnnouncementFields>(empty), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [preview, setPreview] = useState<AnnouncementPreview | null>(null), [confirm, setConfirm] = useState<"send" | "cancel" | null>(null);
  const [scheduledAt, setScheduledAt] = useState(""), [rendered, setRendered] = useState<AnnouncementResponse["rendered"]>();
  const token = useRef<string | undefined>(undefined), operation = useRef<string | null>(null), lock = useRef(false), alive = useRef(true), heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(fields) !== JSON.stringify(selected ? fieldsOf(selected) : empty()), editable = !selected || selected.state === "draft" || selected.state === "scheduled";
  const valid = !!decodeAnnouncementFields(fields);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await requestAnnouncements(undefined, signal);
    if (signal?.aborted || !alive.current) return;
    if (response.formToken) token.current = response.formToken;
    if (response.state === "ready") { setRows(response.announcements ?? []); setSegments(response.segments ?? []); setError(""); }
    else setError(message(response, locale));
    setLoaded(true);
  }, [locale]);
  useEffect(() => { alive.current = true; const controller = new AbortController(); const startup = window.setTimeout(() => { void load(controller.signal); }, 0); return () => { alive.current = false; window.clearTimeout(startup); controller.abort(); }; }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (valid && token.current) void requestAnnouncements({ action: "render", fields, formToken: token.current }, controller.signal).then((response) => { if (!controller.signal.aborted && alive.current) setRendered(response.rendered); });
      else setRendered(undefined);
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [fields, valid, loaded]);
  function change<K extends keyof AnnouncementFields>(key: K, value: AnnouncementFields[K]) { setFields((previous) => ({ ...previous, [key]: value })); setPreview(null); operation.current = null; setSuccess(""); }
  function open(row: Announcement | null) {
    setSelected(row); setFields(row ? fieldsOf(row) : empty()); setScheduledAt(row?.scheduledAt ? new Date(Date.parse(row.scheduledAt) + 3 * 3600000).toISOString().slice(0, 16) : "");
    setPreview(null); setConfirm(null); operation.current = null; setError(""); setSuccess(""); heading.current?.focus();
  }
  async function act(payload: AnnouncementPayload, kind: "save" | "preview" | "send" | "cancel") {
    if (lock.current || !token.current) return;
    lock.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      const response = await requestAnnouncements({ ...payload, formToken: token.current });
      if (!alive.current) return;
      if (response.formToken) token.current = response.formToken;
      if (response.state !== "ready" && response.state !== "updated") {
        setError(message(response, locale));
        if (["conflict", "audience-changed"].includes(response.state)) { setPreview(null); setConfirm(null); operation.current = null; }
        return;
      }
      if (response.announcement) { const row = response.announcement; setSelected(row); setFields(fieldsOf(row)); setRows((previous) => [row, ...previous.filter((item) => item.id !== row.id)]); if (kind === "save" && selected?.state === "scheduled") setScheduledAt(""); }
      if (kind === "preview" && response.preview) { setPreview(response.preview); operation.current = crypto.randomUUID(); setConfirm("send"); }
      else { setPreview(null); setConfirm(null); operation.current = null; setSuccess(kind === "save" ? text.saved : kind === "cancel" ? text.cancelled : scheduledAt ? text.scheduled : text.queued); }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <div className="staff-announcements">
    <section className="staff-panel"><p>{text.intro}</p><p className="staff-note">{text.draftNote}</p></section>
    <div role="status" aria-live="polite">{success}</div>{error ? <p role="alert" className="staff-note">{error}</p> : null}
    {!loaded ? <p role="status">{text.loading}</p> : <>
      <section className="staff-panel" aria-labelledby="announcement-compose-title"><div className="staff-detail-head"><h2 ref={heading} tabIndex={-1} id="announcement-compose-title">{text.compose}</h2><Button variant="secondary" disabled={busy} onClick={() => open(null)}>{text.newDraft}</Button></div>
        {selected ? <p className="staff-badge">{text.states[selected.state]}</p> : null}{selected?.lastError ? <p role="alert">{selected.lastError === "audience_changed" ? text.reviewAgain : text.authorChanged}</p> : null}
        <form onSubmit={(event) => { event.preventDefault(); void act({ action: "save", input: { ...fields, ...(selected ? { id: selected.id } : {}), expectedVersion: selected?.version ?? 0 } }, "save"); }}>
          <fieldset disabled={busy || !editable} className="staff-announcement-fields"><legend className="sr-only">{text.compose}</legend><p className="staff-muted">{text.plainText}</p>
            <div className="staff-content-languages">{(["en", "ar"] as const).map((language) => <fieldset key={language} className="staff-content-language"><legend>{language === "ar" ? text.arabic : text.english}</legend>
              <div className="field"><label className="field-label" htmlFor={`announcement-subject-${language}`}>{text.subject} ({language === "ar" ? text.arabic : text.english})</label><input id={`announcement-subject-${language}`} className="field-input" lang={language} dir={language === "ar" ? "rtl" : "ltr"} required maxLength={90} value={fields[language === "ar" ? "subjectAr" : "subjectEn"]} onChange={(event) => change(language === "ar" ? "subjectAr" : "subjectEn", event.target.value)} /></div>
              <div className="field"><label className="field-label" htmlFor={`announcement-body-${language}`}>{text.body} ({language === "ar" ? text.arabic : text.english})</label><textarea id={`announcement-body-${language}`} className="field-input" lang={language} dir={language === "ar" ? "rtl" : "ltr"} required rows={7} maxLength={3500} value={fields[language === "ar" ? "bodyAr" : "bodyEn"]} onChange={(event) => change(language === "ar" ? "bodyAr" : "bodyEn", event.target.value)} /></div>
            </fieldset>)}</div>
            <fieldset className="staff-announcement-segments"><legend>{text.audience}</legend><p className="staff-muted">{text.audienceHint}</p>{!segments.length ? <p>{text.noSegments}</p> : segments.map((segment) => <label className="staff-media-checkbox" key={segment}><input type="checkbox" checked={fields.segments.includes(segment)} onChange={(event) => change("segments", event.target.checked ? [...fields.segments, segment] : fields.segments.filter((key) => key !== segment))} /><span>{text.segments[segment]}</span></label>)}</fieldset>
          </fieldset>
          {dirty && editable ? <p className="staff-muted">{text.unsaved}</p> : null}{editable ? <Button type="submit" disabled={busy || !valid || !dirty && selected?.state !== "scheduled" && !selected?.lastError}>{text.save}</Button> : null}
        </form>
        {selected && editable ? <div className="staff-announcement-send"><div className="field"><label className="field-label" htmlFor="announcement-schedule">{text.schedule}</label><input id="announcement-schedule" className="field-input" type="datetime-local" dir="ltr" disabled={busy} value={scheduledAt} onChange={(event) => { setScheduledAt(event.target.value); setConfirm(null); operation.current = null; }} aria-describedby="announcement-schedule-hint" /><p id="announcement-schedule-hint" className="staff-muted">{text.scheduleHint}</p></div><div className="staff-actions"><Button disabled={busy || dirty || selected.state !== "draft"} onClick={() => void act({ action: "preview", announcementId: selected.id, version: selected.version }, "preview")}>{text.preview}</Button><Button variant="secondary" disabled={busy} onClick={() => { operation.current = crypto.randomUUID(); setConfirm("cancel"); }}>{text.cancel}</Button></div></div> : null}
      </section>
      <LiveEmail locale={locale} fields={fields} rendered={rendered} />
      <section className="staff-panel" aria-labelledby="announcement-history-title"><div className="staff-detail-head"><h2 id="announcement-history-title">{text.history}</h2><Button variant="secondary" disabled={busy} onClick={() => void load()}>{text.refresh}</Button></div><p className="staff-muted">{text.held}</p>
        {!rows.length ? <p>{text.empty}</p> : <ol className="staff-announcement-history">{rows.map((row) => <li key={row.id}><h3 lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>{locale === "ar" ? row.subjectAr : row.subjectEn}</h3><p className="staff-badge">{text.states[row.state]}</p>{row.lastError ? <p>{row.lastError === "audience_changed" ? text.reviewAgain : text.authorChanged}</p> : null}
          <dl className="staff-metrics"><div><dt>{text.recipients}</dt><dd>{formatStaffNumber(row.recipientCount, locale)}</dd></div><div><dt>{text.sent}</dt><dd>{formatStaffNumber(row.sentCount, locale)}</dd></div><div><dt>{text.failed}</dt><dd>{formatStaffNumber(row.failedCount, locale)}</dd></div></dl>
          <p>{text.updated}: <time dateTime={row.updatedAt}>{formatStaffDate(row.updatedAt, locale, text.unknown)}</time></p>{row.scheduledAt ? <p>{text.scheduledFor}: <time dateTime={row.scheduledAt}>{formatStaffDate(row.scheduledAt, locale, text.unknown)}</time></p> : null}{row.sentAt ? <p>{text.sentAt}: <time dateTime={row.sentAt}>{formatStaffDate(row.sentAt, locale, text.unknown)}</time></p> : null}
          <Button size="small" variant="secondary" disabled={busy} onClick={() => open(row)}>{text.edit}<span className="sr-only">: {locale === "ar" ? row.subjectAr : row.subjectEn}</span></Button>
        </li>)}</ol>}
      </section>
    </>}
    {confirm && selected ? <Confirmation locale={locale} preview={preview} scheduledAt={scheduledAt} cancel={confirm === "cancel"} busy={busy} error={error} onClose={() => setConfirm(null)} onConfirm={() => {
      const operationId = operation.current ?? (operation.current = crypto.randomUUID());
      if (confirm === "cancel") void act({ action: "cancel", announcementId: selected.id, version: selected.version, operationId, confirmed: true }, "cancel");
      else if (preview) { const instant = scheduledAt ? Date.parse(`${scheduledAt}:00+03:00`) : null; if (instant !== null && !Number.isFinite(instant)) { setError(text.errors.invalid); setConfirm(null); return; } void act({ action: "send", announcementId: selected.id, version: selected.version, operationId, previewToken: preview.previewToken, scheduledAt: instant === null ? null : new Date(instant).toISOString(), confirmed: true }, "send"); }
    }} /> : null}
  </div>;
}
