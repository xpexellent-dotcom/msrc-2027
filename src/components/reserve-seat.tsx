"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Arrow } from "@/components/ui/arrow";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import type { Locale } from "@/lib/i18n";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** A native sign-in link upgrades only after hydration. No account state changes here. */
export function ReserveSeat({ locale, label, className = "", size = "default", placement = "below", testId }: {
  locale: Locale; label: string; className?: string; size?: "default" | "small";
  placement?: "below" | "above"; testId?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const copy = participantCopy[locale];
  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) close(); };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  return <div ref={root} className={`reserve-seat ${className ? `${className}-wrap` : ""}`} data-placement={placement}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    {hydrated ? <Button ref={trigger} variant="gold" size={size} className={className} data-testid={testId}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>{label}<Arrow /></Button>
      : <ButtonLink href={`/${locale}/sign-in`} variant="gold" size={size} className={className} data-testid={testId}>{label}<Arrow /></ButtonLink>}
    <div className="reserve-seat-panel" id={id} hidden={!open}>
      <Link href={`/${locale}/sign-in`}>{copy.signIn}<Arrow /></Link>
      <Link href={`/${locale}/sign-up`}>{copy.signUp}<Arrow /></Link>
    </div>
  </div>;
}
