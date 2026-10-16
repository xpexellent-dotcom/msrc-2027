"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/form-field";
import type { Locale } from "@/lib/i18n";
import { staffCopy } from "./copy";
import type { StaffResponse } from "./ui-contract";
import { maskIdentity } from "./menu";

/** Takes only an already-masked projection. Revealing always makes an audited server request. */
export function IdentityDocument({ locale, masked, allowReveal, busy, onReveal }: { locale: Locale; masked: string | null; allowReveal: boolean; busy: boolean; onReveal: (reason: string) => Promise<StaffResponse> }) {
  const copy = staffCopy[locale];
  const [revealed, setRevealed] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const reasonId = useId();
  useEffect(() => {
    const clear = window.setTimeout(() => { setRevealed(null); setReason(""); }, 0);
    return () => window.clearTimeout(clear);
  }, [allowReveal, locale]);
  useEffect(() => {
    const hide = () => { setRevealed(null); setReason(""); };
    window.addEventListener("pagehide", hide);
    const visibility = () => { if (document.visibilityState !== "visible") hide(); };
    document.addEventListener("visibilitychange", visibility);
    // Future revealed fields are brief, local display state and are never persisted.
    const timer = revealed ? window.setTimeout(hide, 30_000) : null;
    return () => { window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", visibility); if (timer) window.clearTimeout(timer); };
  }, [revealed]);
  if (!masked) return <span className="staff-muted">{copy.identityPending}</span>;
  return <div className="staff-identity">
    <bdi dir="ltr" data-testid="identity-value">{allowReveal && revealed ? revealed : maskIdentity(masked)}</bdi>
    {allowReveal && !revealed ? <FormField id={reasonId} label={copy.revealReason} value={reason} maxLength={300} autoComplete="off" required disabled={busy}
      onChange={(event) => setReason(event.target.value)} /> : null}
    {allowReveal ? <Button size="small" variant="secondary" disabled={busy || !revealed && !reason.trim()} title={copy.revealHint} onClick={async () => {
      if (revealed) { setRevealed(null); return; }
      const response = await onReveal(reason.trim());
      setReason("");
      if (response.state === "updated" && typeof response.identity === "string") setRevealed(response.identity);
    }}>{revealed ? copy.hide : copy.reveal}</Button> : null}
  </div>;
}
