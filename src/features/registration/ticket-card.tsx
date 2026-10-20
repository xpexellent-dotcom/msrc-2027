"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import type { RegistrationTicketResponse } from "./contracts";
import { registrationTicketCopy } from "./ticket-copy";

/** The server supplies a local QR image; raw ticket tokens never enter client props. */
export function RegistrationTicketCard({ locale, initial }: { locale: Locale; initial: RegistrationTicketResponse }) {
  const copy = registrationTicketCopy[locale];
  const [result, setResult] = useState(initial);
  const [checking, setChecking] = useState(initial.state === "denied");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initial.state !== "denied" && attempt === 0) return;
    const controller = new AbortController();
    fetch("/api/registration/ticket", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const value = await response.json() as RegistrationTicketResponse;
        if (controller.signal.aborted) return;
        setResult(value && ["closed", "denied", "area-not-ready", "unavailable", "ready"].includes(value.state) ? value : { state: "unavailable" });
        setChecking(false);
      }).catch(() => { if (!controller.signal.aborted) { setResult({ state: "unavailable" }); setChecking(false); } });
    return () => controller.abort();
  }, [initial.state, attempt]);
  const ticket = !checking && result.state === "ready" ? result.ticket : null;
  const message = checking ? copy.checking : result.state === "closed" ? copy.closed : result.state === "denied" ? copy.denied
    : result.state === "area-not-ready" ? copy.areaNotReady : result.state === "unavailable" ? copy.unavailable
      : ticket?.status === "revoked" ? copy.revoked : ticket?.status === "issued" ? copy.issued : copy.empty;
  return <section className="participant-account-card registration-ticket" aria-label={copy.title} data-testid="registration-ticket">
    <p className="participant-account-status" role="status">{message}</p>
    {ticket ? <>
      <dl className="participant-account-profile"><div><dt>{copy.reference}</dt><dd><bdi dir="ltr" data-testid="ticket-reference">{ticket.referenceCode}</bdi></dd></div></dl>
      {ticket.status === "issued" && ticket.qrDataUrl?.startsWith("data:image/png;base64,") ? <figure className="registration-ticket-qr">
        <Image src={ticket.qrDataUrl} alt={copy.qrAlt} width={320} height={320} unoptimized data-testid="ticket-qr" />
        <figcaption>{copy.keepPrivate}</figcaption>
      </figure> : null}
    </> : null}
    <div className="participant-account-actions">
      {!checking && result.state === "denied" ? <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : null}
      {!checking && ["area-not-ready", "unavailable"].includes(result.state) ? <Button onClick={() => { setChecking(true); setAttempt((value) => value + 1); }}>{copy.retry}</Button> : null}
      <ButtonLink href={`/${locale}/registration`} variant="secondary">{copy.registration}</ButtonLink>
    </div>
  </section>;
}
