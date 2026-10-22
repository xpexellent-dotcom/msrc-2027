"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";
import type { MyRegistrationResponse, RegistrationAction, RegistrationResponse } from "./contracts";
import { myRegistrationCopy } from "./my-registration-copy";
import { RegistrationForm } from "./registration-form";
import { registrationTicketCopy } from "./ticket-copy";

function dateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

/** A display clock only: reaching zero never changes the registration state. */
function OfferCountdown({ expiresAt, serverTime, locale, onDeadline }: {
  expiresAt: string; serverTime: string; locale: Locale; onDeadline: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const duration = Math.max(0, Date.parse(expiresAt) - Date.parse(serverTime));
  const seconds = Math.max(0, Math.ceil((duration - elapsed) / 1000));
  const copy = myRegistrationCopy[locale];
  useEffect(() => {
    const started = performance.now();
    let notified = false;
    const tick = () => {
      const passed = performance.now() - started;
      setElapsed(passed);
      if (passed >= duration && !notified) { notified = true; onDeadline(); }
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [duration, onDeadline]);
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { minimumIntegerDigits: 2 });
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((value) => number.format(value)).join(":");
  return <div className="registration-offer-clock">
    <p>{copy.deadline} <time dateTime={expiresAt}><bdi dir="ltr">{dateTime(expiresAt, locale)}</bdi></time> <span>{locale === "ar" ? "(توقيت الرياض)" : "(Riyadh time)"}</span></p>
    <p data-testid="offer-countdown" role="timer" aria-live="off" aria-label={copy.remaining}>
      <span>{copy.remaining}</span> <bdi dir="ltr">{time}</bdi>
    </p>
    {seconds === 0 ? <p>{copy.deadlinePassed}</p> : null}
  </div>;
}

export function MyRegistration({ locale, initial, initialForm }: {
  locale: Locale; initial: MyRegistrationResponse; initialForm: RegistrationResponse | null;
}) {
  const copy = myRegistrationCopy[locale], ticketCopy = registrationTicketCopy[locale];
  const [result, setResult] = useState(initial);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(initial.state === "denied");
  const [confirmation, setConfirmation] = useState<"cancel" | "decline" | null>(null);
  const operation = useRef<{ action: RegistrationAction; id: string } | null>(null);
  const requestSequence = useRef(0), busy = useRef(false);
  const readController = useRef<AbortController | null>(null);
  const statusHeading = useRef<HTMLHeadingElement>(null), confirmationHeading = useRef<HTMLHeadingElement>(null);
  const actionButtons = useRef<HTMLDivElement>(null);
  const refresh = useCallback(() => {
    if (busy.current) return;
    readController.current?.abort();
    const controller = new AbortController(); readController.current = controller;
    const sequence = ++requestSequence.current;
    return fetch("/api/registration/me?locale=" + locale, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<MyRegistrationResponse>)
      .then((value) => { if (!controller.signal.aborted && sequence === requestSequence.current) { setResult(value); setConfirmation(null); } })
      .catch(() => { if (!controller.signal.aborted && sequence === requestSequence.current) { setResult({ state: "unavailable" }); setConfirmation(null); } })
      .finally(() => { if (!controller.signal.aborted && sequence === requestSequence.current) setChecking(false); });
  }, [locale]);

  useEffect(() => {
    if (initial.state === "denied") void refresh();
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("pageshow", resume); document.addEventListener("visibilitychange", resume);
    return () => { readController.current?.abort(); window.removeEventListener("pageshow", resume); document.removeEventListener("visibilitychange", resume); };
  }, [initial.state, refresh]);
  useEffect(() => { if (confirmation) confirmationHeading.current?.focus(); }, [confirmation]);

  async function act(action: RegistrationAction) {
    if (busy.current || result.state !== "ready") return;
    busy.current = true; setPending(true); readController.current?.abort(); ++requestSequence.current;
    // Keep the operation ID after an uncertain response so a retry cannot repeat a transition.
    if (operation.current?.action !== action) operation.current = { action, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/registration/me", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, operationId: operation.current.id, formToken: result.formToken }) });
      const value = await response.json() as MyRegistrationResponse;
      setResult(value);
      if (value.state === "ready") operation.current = null;
    } catch { setResult({ state: "unavailable" }); }
    finally { busy.current = false; setPending(false); setConfirmation(null); requestAnimationFrame(() => statusHeading.current?.focus()); }
  }

  const ready = !checking && result.state === "ready" ? result : null;
  const status = ready?.registration?.status ?? "not_requested";
  const ticket = ready && ["approved", "confirmed"].includes(status) ? ready.ticket : null;
  const canCancel = ready?.registration && ["pending_approval", "waitlisted", "offered", "approved"].includes(status);
  const canRequest = ready && !ready.registration && ready.window.eligible && ["early-access", "open"].includes(ready.window.state);
  const error = checking ? copy.checking : result.state === "denied" ? copy.denied : result.state === "area-not-ready" ? copy.areaNotReady
    : result.state === "closed" ? copy.closed : result.state === "limited" ? copy.limited : result.state === "invalid_input" ? copy.invalid : copy.unavailable;

  return <div className="my-registration" data-testid="my-registration" dir={locale === "ar" ? "rtl" : "ltr"}>
    <section className="participant-account-card registration-status-card" aria-labelledby="my-registration-status" aria-busy={pending || checking}>
      <h2 id="my-registration-status" data-testid="registration-status" tabIndex={-1} ref={statusHeading}>{ready ? copy.states[status] : error}</h2>
      {ready ? <>
        <p className="registration-status-description">{copy.descriptions[status]}</p>
        {ready.outcome === "conflict" ? <p role="status" className="participant-account-status">{copy.conflict}</p> : null}
        {!ready.registration ? <div className="registration-window" data-testid="registration-window">
          <p>{ready.window.state === "early-access" ? copy.earlyAccess : ready.window.state === "open" ? copy.open : ready.window.state === "closed" ? copy.closed : null}</p>
          {ready.window.state === "early-access" && ready.window.eligible ? <p>{copy.eligible}</p> : null}
          {ready.window.opensAt && ["scheduled", "early-access"].includes(ready.window.state) ? <p>{ready.window.state === "early-access" ? copy.generalOpening : copy.scheduled} <time dateTime={ready.window.opensAt}><bdi dir="ltr">{dateTime(ready.window.opensAt, locale)}</bdi></time> {locale === "ar" ? "(توقيت الرياض)" : "(Riyadh time)"}</p> : null}
        </div> : null}
        {ready.fewPlacesLeft && !ready.registration ? <p className="registration-few-places" data-testid="few-places-left">{copy.fewPlaces}</p> : null}
        {status === "offered" && ready.registration?.offerExpiresAt ? <OfferCountdown key={ready.serverTime} expiresAt={ready.registration.offerExpiresAt} serverTime={ready.serverTime} locale={locale} onDeadline={refresh} /> : null}
        {ticket?.status === "issued" ? <div className="registration-ticket" data-testid="registration-ticket">
          <dl className="participant-account-profile"><div><dt>{ticketCopy.reference}</dt><dd><bdi dir="ltr" data-testid="ticket-reference">{ticket.referenceCode}</bdi></dd></div></dl>
          {ticket.qrDataUrl?.startsWith("data:image/png;base64,") ? <figure className="registration-ticket-qr">
            <Image src={ticket.qrDataUrl} alt={ticketCopy.qrAlt} width={320} height={320} unoptimized data-testid="ticket-qr" />
            <figcaption>{ticketCopy.keepPrivate}</figcaption>
          </figure> : null}
        </div> : null}
        {["approved", "confirmed"].includes(status) && ticket?.status !== "issued" ? <p className="participant-account-status">{ticketCopy.unavailable}</p> : null}
        {ready.registration && ready.attendance.length ? <section className="registration-attendance" aria-labelledby="registration-attendance-title" data-testid="registration-attendance">
          <h3 id="registration-attendance-title">{copy.attendance}</h3>
          <dl className="participant-account-profile">{ready.attendance.map((day) => <div key={day.conferenceDay} data-testid={`attendance-${day.conferenceDay}`}>
            <dt><time dateTime={day.conferenceDay}><bdi dir="ltr">{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
              dateStyle: "long", timeZone: "Asia/Riyadh",
            }).format(new Date(day.conferenceDay + "T00:00:00Z"))}</bdi></time></dt>
            <dd><strong><span aria-hidden="true">{day.checkedInAt ? "✓ " : "○ "}</span>{day.checkedInAt ? copy.checkedIn : copy.notCheckedIn}</strong>
              {day.checkedInAt ? <span>{copy.checkedInAt}: <time dateTime={day.checkedInAt}><bdi dir="ltr">{dateTime(day.checkedInAt, locale)}</bdi></time></span> : null}</dd>
          </div>)}</dl><p className="field-hint">{copy.attendanceHint}</p>
        </section> : null}
        {confirmation ? <section className="registration-confirmation" aria-labelledby="registration-confirm-title" data-testid="registration-confirmation">
          <h3 id="registration-confirm-title" tabIndex={-1} ref={confirmationHeading}>{confirmation === "cancel" ? copy.cancelTitle : copy.declineTitle}</h3>
          <p>{confirmation === "cancel" ? copy.cancelMessage : copy.declineMessage}</p>
          <div className="participant-account-actions">
            <Button onClick={() => void act(confirmation)} loading={pending} loadingLabel={copy.working}>{confirmation === "cancel" ? copy.confirmCancel : copy.confirmDecline}</Button>
            <Button variant="secondary" disabled={pending} onClick={() => {
              const action = confirmation; setConfirmation(null);
              requestAnimationFrame(() => actionButtons.current?.querySelector<HTMLButtonElement>(`[data-registration-action="${action}"]`)?.focus());
            }}>{copy.keep}</Button>
          </div>
        </section> : <div className="participant-account-actions" ref={actionButtons}>
          {status === "offered" ? <>
            <Button onClick={() => void act("accept")} loading={pending} loadingLabel={copy.working}>{copy.accept}</Button>
            <Button data-registration-action="decline" variant="secondary" disabled={pending} onClick={() => setConfirmation("decline")}>{copy.decline}</Button>
          </> : null}
          {canCancel ? <Button data-registration-action="cancel" variant="ghost" disabled={pending} onClick={() => setConfirmation("cancel")}>{copy.cancel}</Button> : null}
        </div>}
      </> : null}
      <div className="participant-account-actions">
        {!checking && result.state === "denied" ? <><ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink><ButtonLink href={`/${locale}/sign-up`} variant="secondary">{copy.createAccount}</ButtonLink></> : null}
        {!checking && result.state !== "closed" ? <Button variant="secondary" disabled={pending} onClick={() => { setChecking(true); setConfirmation(null); void refresh()?.finally(() => requestAnimationFrame(() => statusHeading.current?.focus())); }}>{copy.refresh}</Button> : null}
      </div>
    </section>
    {canRequest ? <RegistrationForm locale={locale} initial={initialForm ?? { state: "denied" }} onSubmitted={() => { void refresh()?.finally(() => requestAnimationFrame(() => statusHeading.current?.focus())); }} /> : null}
    <nav className="participant-account-navigation" aria-label={copy.title}>
      <Link href={`/${locale}/my-msrc`}>{copy.account}</Link><Link href={`/${locale}/contact`}>{copy.support}</Link>
    </nav>
  </div>;
}
