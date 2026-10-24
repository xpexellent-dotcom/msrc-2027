"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { checkInCopy } from "./check-in-copy";
import { CheckInFallbackPanel } from "./check-in-fallback-panel";
import { cameraFailure, createQrDecoder, keepScannerAwake, openCheckInCamera, riyadhConferenceDay } from "./check-in-decoder";
import { formatStaffDate, formatStaffNumber } from "./console-shell";
import { requestStaff } from "./staff-client";
import { staffCopy } from "./copy";
import type { StaffPayload, StaffResponse } from "./ui-contract";

type CheckIn = NonNullable<StaffResponse["checkIn"]>;
type Result = NonNullable<StaffResponse["checkInResult"]>;
const resultIcons: Record<Result["status"], string> = { checked_in: "✓", already_checked_in: "↻", revoked: "×", not_found: "?", wrong_day: "!", not_approved: "!" };
const dayLabel = (day: string, locale: Locale) => new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "full", calendar: "gregory", timeZone: "Asia/Riyadh" }).format(new Date(`${day}T12:00:00+03:00`));

/** CHK-02..05: online, one-day attendance. No camera image, ticket or attendee roster is persisted by this UI; the ENG-082 outage roster is a Super Admin download. */
export function CheckInPanel({ locale, data, busy, canUndo, act }: {
  locale: Locale; data: CheckIn; busy: boolean; canUndo: boolean;
  act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>;
}) {
  const text = checkInCopy[locale], days = data.conferenceDays ?? [];
  const [selectedDay, setSelectedDay] = useState(() => riyadhConferenceDay(days));
  const day = days.includes(selectedDay) ? selectedDay : "";
  const [entryPoint, setEntryPoint] = useState(""), [reference, setReference] = useState("");
  const [result, setResult] = useState<(Result & { day: string }) | null>(null), [reason, setReason] = useState("");
  const [summary, setSummary] = useState(data.summary), [countFailure, setCountFailure] = useState(false), [refreshKey, setRefreshKey] = useState(0);
  const [scanning, setScanning] = useState(false), [starting, setStarting] = useState(false), [cameraMessage, setCameraMessage] = useState<"https" | "permission" | "unavailable" | "" >("");
  const [online, setOnline] = useState(true), [feedback, setFeedback] = useState(false), [keepAwake, setKeepAwake] = useState(false);
  const [wakeAvailable, setWakeAvailable] = useState(false), [wakeFailed, setWakeFailed] = useState(false), [undone, setUndone] = useState(false);
  const video = useRef<HTMLVideoElement>(null), camera = useRef<AbortController | null>(null), resultCard = useRef<HTMLDivElement>(null);
  const submitting = useRef(false), alive = useRef(true);
  const resultText = result ? text.outcomes[result.status] : null;

  function stopCamera() { camera.current?.abort(); camera.current = null; setScanning(false); setStarting(false); }

  useEffect(() => {
    alive.current = true;
    const connected = () => setOnline(navigator.onLine);
    const hidden = () => { if (document.visibilityState !== "visible") { camera.current?.abort(); camera.current = null; setScanning(false); setStarting(false); } };
    const disconnected = () => { connected(); camera.current?.abort(); camera.current = null; setScanning(false); setStarting(false); };
    const initialize = window.setTimeout(() => { connected(); setWakeAvailable("wakeLock" in navigator); }, 0);
    window.addEventListener("online", connected); window.addEventListener("offline", disconnected); document.addEventListener("visibilitychange", hidden);
    return () => { alive.current = false; camera.current?.abort(); window.clearTimeout(initialize); window.removeEventListener("online", connected); window.removeEventListener("offline", disconnected); document.removeEventListener("visibilitychange", hidden); };
  }, []);

  useEffect(() => {
    if (!day) return;
    const controller = new AbortController();
    const refresh = async () => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      const response = await requestStaff(undefined, { area: "check-in", day, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.checkIn) { setSummary(response.checkIn.summary); setCountFailure(false); }
      else setCountFailure(true);
    };
    void refresh(); const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [day, refreshKey]);

  useEffect(() => {
    if (!scanning || !keepAwake || !wakeAvailable) return;
    const controller = new AbortController();
    void keepScannerAwake(controller.signal, navigator.wakeLock).catch(() => { if (!controller.signal.aborted) setWakeFailed(true); });
    return () => controller.abort();
  }, [scanning, keepAwake, wakeAvailable]);

  useEffect(() => { if (result) resultCard.current?.focus(); }, [result]);

  async function checkIn(value: string) {
    if (!day || !value.trim() || busy || submitting.current) return;
    if (!navigator.onLine) { setOnline(false); stopCamera(); return; }
    submitting.current = true; setResult(null); setUndone(false); setReason("");
    const response = await act({ action: "check-in", ticketTokenOrReference: value.trim(), conferenceDay: day, entryPoint: entryPoint.trim() });
    submitting.current = false;
    if (!alive.current) return;
    if (response.checkInResult) {
      setResult({ ...response.checkInResult, day });
      if (response.checkInResult.status === "checked_in") {
        setReference("");
        if (feedback && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(100);
      }
      if (response.checkIn) setSummary(response.checkIn.summary);
      else setRefreshKey((value) => value + 1);
    }
  }

  async function startCamera() {
    if (!day || busy || camera.current) return;
    if (window.location.protocol !== "https:" || !window.isSecureContext) { setCameraMessage("https"); return; }
    if (!navigator.onLine) { setOnline(false); return; }
    if (!navigator.mediaDevices?.getUserMedia || !video.current) { setCameraMessage("unavailable"); return; }
    const controller = new AbortController(); camera.current = controller; setStarting(true); setCameraMessage(""); setWakeFailed(false);
    try {
      const stream = await openCheckInCamera(video.current, controller.signal, navigator.mediaDevices);
      if (!stream || controller.signal.aborted) return;
      const decode = await createQrDecoder();
      if (controller.signal.aborted) return;
      setStarting(false); setScanning(true);
      const scan = async () => {
        if (controller.signal.aborted || !video.current) return;
        try {
          if (video.current.readyState >= 2) {
            const value = await decode(video.current);
            if (controller.signal.aborted) return;
            if (value) { stopCamera(); void checkIn(value); return; }
          }
          if (!controller.signal.aborted) window.setTimeout(() => void scan(), 300);
        } catch { if (!controller.signal.aborted) { stopCamera(); setCameraMessage("unavailable"); } }
      };
      void scan();
    } catch (error) { if (!controller.signal.aborted) { stopCamera(); setCameraMessage(cameraFailure(error)); } }
  }

  async function undo(event: FormEvent) {
    event.preventDefault(); if (!result?.attendanceId || !reason.trim() || !canUndo) return;
    const response = await act({ action: "check-in-undo", attendanceId: result.attendanceId, reason: reason.trim() });
    if (alive.current && response.state === "updated") { setResult(null); setReason(""); setUndone(true); setRefreshKey((value) => value + 1); }
  }

  return <section className="staff-panel staff-checkin" aria-label={staffCopy[locale].areas["check-in"]}>
    <p>{text.intro}</p>
    {!online ? <p className="staff-note" role="alert">{text.offline}</p> : null}
    {!days.length ? <p className="staff-note" role="status">{text.noDays}</p> : null}
    <div className="staff-checkin-settings">
      <label className="field"><span className="field-label">{text.day}</span><select className="field-input" value={day} disabled={busy || !days.length} onChange={(event) => { stopCamera(); setSelectedDay(event.target.value); setResult(null); setUndone(false); }}>
        <option value="">{text.chooseDay}</option>{days.map((value) => <option key={value} value={value}>{dayLabel(value, locale)}</option>)}
      </select></label>
      <FormField id="checkin-entry" label={text.entryPoint} hint={text.entryHint} value={entryPoint} maxLength={120} disabled={busy || scanning || starting} onChange={(event) => setEntryPoint(event.target.value)} />
    </div>
    <div className="staff-checkin-counts"><h2>{text.counts}</h2><dl className="staff-seat-bar" data-testid="checkin-counts">
      {([["checkedIn", text.total], ["scan", text.scans], ["manualCode", text.manualCount], ["offline", text.offlineCount]] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{day && summary?.day === day ? formatStaffNumber(summary[key], locale) : "—"}</dd></div>)}
    </dl><Button size="small" variant="secondary" disabled={!day || busy || !online} onClick={() => setRefreshKey((value) => value + 1)}>{text.refresh}</Button>{countFailure ? <p role="status">{text.countFailure}</p> : null}</div>
    <div className="staff-checkin-camera"><h2>{text.camera}</h2>
      <video ref={video} className="staff-checkin-video" hidden={!scanning} muted playsInline aria-label={text.camera} />
      {scanning || starting ? <p role="status">{starting ? text.starting : text.scanning}</p> : null}
      <Button variant="secondary" disabled={!day || busy || !online} onClick={() => scanning || starting ? stopCamera() : void startCamera()}>{scanning || starting ? text.stop : result ? text.next : text.start}</Button>
      {cameraMessage ? <p role="status">{text[cameraMessage]}</p> : null}
      <div className="staff-checkin-options">
        <label><input type="checkbox" checked={feedback} onChange={(event) => setFeedback(event.target.checked)} /><span>{text.feedback}<small>{text.feedbackHint}</small></span></label>
        {wakeAvailable ? <label><input type="checkbox" checked={keepAwake} onChange={(event) => { setKeepAwake(event.target.checked); setWakeFailed(false); }} /><span>{text.awake}</span></label> : null}
      </div>{wakeFailed ? <p role="status">{text.awakeFailure}</p> : null}
    </div>
    <form className="staff-checkin-manual" onSubmit={(event) => { event.preventDefault(); stopCamera(); void checkIn(reference); }} aria-busy={busy}>
      <FormField id="checkin-reference" label={text.manual} hint={text.manualHint} value={reference} onChange={(event) => setReference(event.target.value)} dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={256} required disabled={busy || !day} />
      <Button type="submit" disabled={busy || !day || !reference.trim() || !online}>{busy ? text.checking : text.submit}</Button>
    </form>
    {result && resultText ? <div ref={resultCard} tabIndex={-1} className={`staff-checkin-result staff-checkin-result--${result.status}`} role="status" data-testid="checkin-result" data-result={result.status}>
      <span className="staff-checkin-icon" aria-hidden="true">{resultIcons[result.status]}</span><div><h2>{resultText.title}</h2><p>{resultText.detail}</p><p>{text.resultDay}: {dayLabel(result.day, locale)}</p>
      {result.checkedInAt ? <p>{text.at}: {formatStaffDate(result.checkedInAt, locale, "—")}</p> : null}{result.performedBy ? <p>{text.by}: <bdi>{result.performedBy}</bdi></p> : null}</div>
    </div> : null}
    {result?.attendanceId && canUndo ? <form className="staff-checkin-undo" onSubmit={(event) => void undo(event)}>
      <FormField id="checkin-undo-reason" label={text.undoReason} hint={text.undoHint} value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={300} disabled={busy} />
      <Button variant="secondary" disabled={busy || !reason.trim()} type="submit">{text.undo}</Button>
    </form> : null}
    {undone ? <p role="status">{text.undone}</p> : null}
    {canUndo ? <CheckInFallbackPanel locale={locale} day={day} /> : null}
  </section>;
}
