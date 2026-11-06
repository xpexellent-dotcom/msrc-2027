"use client";

import Image from "next/image";
import { createContext, useContext, useId, useRef, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Arrow } from "@/components/ui/arrow";
import { brandLogo } from "@/content/brand-identity";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import type { Locale } from "@/lib/i18n";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const ReserveContext = createContext<((trigger: HTMLElement) => void) | null>(null);

/** One native top-layer dialog shared by navigation Reserve actions. */
export function ReserveSeatProvider({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const firstChoice = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const copy = participantCopy[locale];
  const title = locale === "ar" ? "احجز مقعدك" : "Reserve your seat";
  const close = () => dialog.current?.close();
  const open = (trigger: HTMLElement) => {
    returnFocus.current = trigger;
    dialog.current?.showModal();
    firstChoice.current?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
  };
  return <ReserveContext value={open}>
    {children}
    <dialog ref={dialog} className="reserve-seat-dialog" aria-labelledby={titleId} aria-describedby={bodyId}
      onClose={() => returnFocus.current?.focus({ preventScroll: true })}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
      }}>
      <button className="reserve-seat-close" type="button" aria-label={locale === "ar" ? "إغلاق" : "Close"} onClick={close}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>
      <Image src={brandLogo.onPurple} alt="" width={80} height={80} unoptimized className="reserve-seat-seal" />
      <h2 id={titleId}>{title}</h2>
      <p id={bodyId}>{copy.newHereBody}</p>
      <div ref={firstChoice} className="reserve-seat-choices">
        <ButtonLink href={"/" + locale + "/sign-in"} variant="gold" onClick={close}>{copy.signIn}<Arrow /></ButtonLink>
        <ButtonLink href={"/" + locale + "/sign-up"} variant="outline-inverse" onClick={close}>{copy.signUp}<Arrow /></ButtonLink>
      </div>
    </dialog>
  </ReserveContext>;
}

/** Keep a navigable sign-in link until hydration. */
export function ReserveSeat({ locale, label, className = "", size = "default", testId, beforeOpen, focusReturn }: {
  locale: Locale; label: string; className?: string; size?: "default" | "small"; testId?: string;
  beforeOpen?: () => void; focusReturn?: () => HTMLElement | null;
}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const open = useContext(ReserveContext);
  return <div className={"reserve-seat " + (className ? className + "-wrap" : "")}>
    {hydrated && open ? <Button variant="gold" size={size} className={className} data-testid={testId}
      aria-haspopup="dialog" onClick={(event) => {
        const trigger = focusReturn?.() ?? event.currentTarget;
        beforeOpen?.();
        open(trigger);
      }}>{label}<Arrow /></Button>
      : <ButtonLink href={"/" + locale + "/sign-in"} variant="gold" size={size} className={className} data-testid={testId}>{label}<Arrow /></ButtonLink>}
  </div>;
}
