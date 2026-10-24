"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { workshopParticipantProjection, type Workshop, type WorkshopBooking, type WorkshopParticipantAction, type WorkshopParticipantResponse } from "./participant-contracts";
import { workshopParticipantCopy } from "./participant-copy";
import { createWorkshopRequester } from "./participant-client";
import "./participant.css";

function clock(value: string | null, locale: Locale) {
  return value ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(value)) : null;
}
export function workshopPrice(workshop: Pick<Workshop, "priceMinor" | "currency">, locale: Locale) {
  if (workshop.priceMinor === null || !workshop.currency) return null;
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { style: "currency", currency: workshop.currency }).format(workshop.priceMinor / 100);
}
const active = (booking: WorkshopBooking) => ["held", "approved", "confirmed", "waitlisted", "offered"].includes(booking.status);
export function MyWorkshopBookings({ locale, initialState }: { locale: Locale; initialState?: WorkshopParticipantResponse }) {
  const copy = workshopParticipantCopy[locale];
  const [state, setState] = useState<WorkshopParticipantResponse | null>(initialState ?? null), [generation, setGeneration] = useState(0);
  const [pending, setPending] = useState(false), [feedback, setFeedback] = useState("");
  const mounted = useRef(false), sequence = useRef(0), status = useRef<HTMLParagraphElement>(null);
  const requester = useRef<ReturnType<typeof createWorkshopRequester> | null>(null);
  function projection(value: WorkshopParticipantResponse): WorkshopParticipantResponse | null {
    const current = workshopParticipantProjection({ state: value.state, workshops: value.workshops, bookings: value.bookings, serverNow: value.serverNow, mockPaymentEnabled: value.mockPaymentEnabled });
    return current && typeof value.formToken === "string" ? { state: "ready", ...current, formToken: value.formToken } : null;
  }
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController(), current = ++sequence.current;
    async function load() {
      try {
        const response = await fetch("/api/workshops?locale=" + locale, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const value: WorkshopParticipantResponse = await response.json();
        if (controller.signal.aborted || sequence.current !== current) return;
        setState(projection(value) ?? { state: ["closed", "denied", "area-not-ready"].includes(value.state) ? value.state : "unavailable" });
      } catch { if (!controller.signal.aborted && sequence.current === current) setState({ state: "unavailable" }); }
    }
    void load();
    return () => { mounted.current = false; controller.abort(); sequence.current += 1; };
  }, [locale, generation]);
  async function act(action: WorkshopParticipantAction, id: string) {
    if (pending || !state?.formToken) return;
    const current = ++sequence.current; setPending(true); setFeedback("");
    try {
      requester.current ??= createWorkshopRequester();
      const { value } = await requester.current(action, id, state.formToken, locale);
      if (!mounted.current || sequence.current !== current) return;
      const next = projection(value);
      if (next) setState(next);
      else if (["closed", "denied", "area-not-ready"].includes(value.state)) setState({ state: value.state });
      else if (value.formToken) setState((previous) => previous ? { ...previous, formToken: value.formToken } : previous);
      const outcome = value.outcome;
      setFeedback(outcome === "conflict" ? copy.conflictOutcome : outcome ? copy[outcome] : value.state === "invalid_input" || value.state === "limited" ? copy[value.state] : copy.unavailable);
      status.current?.focus();
    } catch { if (mounted.current && sequence.current === current) setFeedback(copy.unavailable); }
    finally { if (mounted.current && sequence.current === current) setPending(false); }
  }
  const action = (name: WorkshopParticipantAction, id: string) => <Button variant="secondary" size="small" disabled={pending || !state?.formToken} onClick={() => void act(name, id)}>{copy[name]}</Button>;
  return <section className="workshop-bookings" data-testid="workshop-bookings" aria-labelledby="workshop-bookings-title" dir={locale === "ar" ? "rtl" : "ltr"}>
    <header><h2 id="workshop-bookings-title">{copy.title}</h2><p>{copy.lead}</p></header>
    <p ref={status} tabIndex={-1} role="status" aria-live="polite">{pending ? copy.pending : feedback}</p>
    {!state ? <p>{copy.loading}</p> : state.state !== "ready" ? <>
      <p>{state.state === "area-not-ready" ? copy.notReady : state.state === "closed" ? copy.closed : state.state === "denied" ? copy.denied : copy.unavailable}</p>
      {state.state !== "closed" && state.state !== "denied" ? <Button variant="secondary" onClick={() => setGeneration((value) => value + 1)}>{copy.retry}</Button> : null}
    </> : <>
      <p>{copy.manual}</p><p>{copy.registration}</p>
      {!state.bookings?.length ? <p>{copy.empty}</p> : <ol className="workshop-bookings-list">{state.bookings.map((booking) => {
        const workshop = state.workshops!.find((item) => item.id === booking.workshopId)!;
        return <li key={booking.id}><article data-testid="workshop-booking" className="workshop-booking-card"><h3>{(locale === "ar" ? workshop.titleAr : workshop.titleEn) ?? copy.untitled}</h3>
          <p className="workshop-booking-status">{copy.statuses[booking.status]}</p>
          <p>{clock(workshop.startAt, locale)}{workshop.endAt ? " – " + clock(workshop.endAt, locale) : ""} {copy.riyadh}</p>
          <dl><div><dt>{copy.requested}</dt><dd>{clock(booking.requestedAt, locale)}</dd></div>{booking.expiresAt ? <div><dt>{copy.expires}</dt><dd>{clock(booking.expiresAt, locale)} ({copy.riyadh})</dd></div> : null}</dl>
          {booking.conflict ? <p className="workshop-booking-warning">{copy.conflict}</p> : null}
          {booking.checkedInAt ? <p>{copy.checkedIn}: {clock(booking.checkedInAt, locale)}</p> : null}
          {booking.completedAt ? <p>{copy.completed}: {clock(booking.completedAt, locale)}</p> : null}
          <div className="workshop-booking-actions">{booking.status === "offered" ? <>{action("accept_offer", booking.id)}{action("decline_offer", booking.id)}</> : null}
            {booking.status === "approved" && !booking.conflict ? <>{booking.fullDiscount || workshop.priceMinor === 0 ? action("redeem_discount", booking.id) : state.mockPaymentEnabled ? <>{action("mock_pay", booking.id)}<p>{copy.mockNotice}</p></> : null}</> : null}
            {active(booking) && booking.status !== "offered" ? action("cancel", booking.id) : null}</div>
        </article></li>;
      })}</ol>}
      <h3>{copy.catalogue}</h3>{!state.workshops?.some((workshop) => workshop.published && !workshop.removed) ? <p>{copy.noWorkshops}</p> : <div className="workshop-bookings-catalogue">{state.workshops.filter((workshop) => workshop.published && !workshop.removed).map((workshop) => {
        const existing = state.bookings!.some((booking) => booking.workshopId === workshop.id);
        return <article className="workshop-booking-card" data-testid="workshop-booking-option" key={workshop.id}><h4>{(locale === "ar" ? workshop.titleAr : workshop.titleEn) ?? copy.untitled}</h4>
          <p>{locale === "ar" ? workshop.descriptionAr : workshop.descriptionEn}</p>
          <p>{clock(workshop.startAt, locale) ?? copy.notSet}{workshop.endAt ? " – " + clock(workshop.endAt, locale) : ""} ({copy.riyadh})</p>
          <dl>{[[copy.instructor, workshop.instructor], [copy.room, workshop.room], [copy.eligibility, locale === "ar" ? workshop.eligibilityAr : workshop.eligibilityEn], [copy.price, workshopPrice(workshop, locale)], [copy.capacity, workshop.capacity], [copy.remaining, workshop.remaining], [copy.deadline, clock(workshop.bookingDeadline, locale)], [copy.buffer, workshop.transferBufferMinutes]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? copy.notSet}</dd></div>)}</dl>
          {!existing && workshop.ready ? <div className="workshop-booking-actions">{Number(workshop.remaining) > 0 ? action("request", workshop.id) : action("waitlist", workshop.id)}</div> : !workshop.ready ? <p>{copy.workshopClosed}</p> : null}
        </article>;
      })}</div>}
      <Button variant="ghost" disabled={pending} onClick={() => setGeneration((value) => value + 1)}>{copy.retry}</Button>
    </>}
  </section>;
}
