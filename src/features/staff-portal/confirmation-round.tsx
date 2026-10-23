"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { confirmationCopy } from "./confirmation-copy";
import { formatStaffDate } from "./console-shell";
import { staffCopy } from "./copy";
import type { StaffConfirmationPolicy, StaffConfirmationPreview, StaffPayload, StaffResponse } from "./ui-contract";

/** The database binds this preview to its current recipients and settings. */
export function ConfirmationRound({ locale, busy, loadPreview, act, onResult }: {
  locale: Locale; busy: boolean; loadPreview: () => Promise<StaffResponse>;
  act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse>; onResult: (text: string) => void;
}) {
  const copy = confirmationCopy[locale], staff = staffCopy[locale];
  const [preview, setPreview] = useState<StaffConfirmationPreview | null>(null);
  const [policy, setPolicy] = useState<StaffConfirmationPolicy | "">("");
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLDivElement>(null), operation = useRef("");
  useEffect(() => { if (preview) dialog.current?.showModal(); }, [preview]);
  const message = (response: StaffResponse) => response.state === "operation-conflict" ? copy.conflict
    : response.state === "confirmation-not-due" ? copy.notDue : staff.states[response.state as keyof typeof staff.states] ?? staff.states.unavailable;
  function close() { dialog.current?.close(); setPreview(null); setPolicy(""); trigger.current?.querySelector("button")?.focus(); }
  async function review() {
    setLoading(true); setError("");
    const result = await loadPreview();
    setLoading(false);
    if (!result.confirmationPreview) { setError(message(result)); return; }
    setPolicy(""); operation.current = crypto.randomUUID(); setPreview(result.confirmationPreview);
  }
  async function start() {
    if (!policy || !preview?.canStart || !preview.previewToken || busy || loading) return;
    setLoading(true); setError("");
    const result = await act({ action: "registration-confirmation-start", operationId: operation.current, nonresponsePolicy: policy, previewToken: preview.previewToken });
    setLoading(false);
    if (result.state === "updated" && typeof result.confirmationOpened === "number") { close(); onResult(copy.done(result.confirmationOpened)); }
    else { if (result.state === "operation-conflict" || result.state === "confirmation-not-due") close(); setError(message(result)); }
  }
  return <div className="staff-confirmation-round" ref={trigger}>
    <Button size="small" variant="secondary" disabled={busy || loading} onClick={() => void review()} data-testid="confirmation-start">{copy.start}</Button>
    {!preview && error ? <p role="alert">{error}</p> : null}
    {preview ? <dialog ref={dialog} className="staff-confirmation-dialog" aria-labelledby="confirmation-round-title"
      onCancel={(event) => { event.preventDefault(); if (!busy && !loading) close(); }}>
      <h3 id="confirmation-round-title">{copy.review}</h3>
      <p data-testid="confirmation-recipient-count">{copy.recipients(preview.eligibleCount)}</p>
      <p>{copy.laterApprovals}</p>
      {preview.responseHours !== null ? <p>{copy.duration(preview.responseHours)}</p> : null}
      {preview.opensAt ? <p>{copy.opens}: {formatStaffDate(preview.opensAt, locale, staff.unknown)}</p> : null}
      {!preview.settingsReady ? <p className="staff-note">{copy.settings}</p> : !preview.eligibleCount ? <p className="staff-note">{copy.noRecipients}</p> : !preview.canStart ? <p className="staff-note">{copy.notDue}</p> : null}
      <fieldset disabled={busy || loading || !preview.canStart} aria-describedby="confirmation-policy-hint">
        <legend>{copy.policy}</legend>
        <label><input type="radio" name="confirmation-policy" value="release_unconfirmed" checked={policy === "release_unconfirmed"} onChange={() => setPolicy("release_unconfirmed")} />{copy.release}</label>
        <label><input type="radio" name="confirmation-policy" value="keep_unconfirmed" checked={policy === "keep_unconfirmed"} onChange={() => setPolicy("keep_unconfirmed")} />{copy.keep}</label>
        <p id="confirmation-policy-hint" className="field-hint">{copy.policyHint}</p>
      </fieldset>
      <p className="staff-muted">{copy.delivery}</p>{error ? <p role="alert">{error}</p> : null}
      <div className="staff-actions"><Button disabled={busy || loading || !preview.canStart || !policy} onClick={() => void start()}>{copy.confirm}</Button>
        <Button variant="secondary" disabled={busy || loading} onClick={close}>{copy.cancel}</Button></div>
    </dialog> : null}
  </div>;
}
