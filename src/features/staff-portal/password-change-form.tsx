"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { staffCopy } from "./copy";
import type { StaffPayload, StaffResponse } from "./ui-contract";

export function PasswordChangeForm({ locale, busy, act }: { locale: Locale; busy: boolean; act: (payload: Omit<StaffPayload, "formToken">) => Promise<StaffResponse> }) {
  const copy = staffCopy[locale], form = useRef<HTMLFormElement>(null), feedback = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState<{ kind: "password" | "passwordConfirmation" | "required" } | null>(null);
  useEffect(() => {
    const clear = () => form.current?.reset();
    const hidden = () => { if (document.visibilityState === "hidden") clear(); };
    window.addEventListener("pagehide", clear); document.addEventListener("visibilitychange", hidden);
    return () => { clear(); window.removeEventListener("pagehide", clear); document.removeEventListener("visibilitychange", hidden); };
  }, [locale]);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("password") ?? ""), passwordConfirmation = String(fields.get("passwordConfirmation") ?? "");
    // No password draft/store: clear the DOM before any asynchronous provider operation.
    event.currentTarget.reset();
    if (!password || !passwordConfirmation) { setError({ kind: "required" }); return; }
    if (Array.from(password).length < 10 || new TextEncoder().encode(password).length > 72) { setError({ kind: "password" }); return; }
    if (password !== passwordConfirmation) { setError({ kind: "passwordConfirmation" }); return; }
    setError(null); void act({ action: "password-change", password, passwordConfirmation });
  }

  return <section className="staff-panel staff-auth-panel staff-password-panel" aria-labelledby="staff-password-change-heading">
    <h2 id="staff-password-change-heading">{copy.changePassword}</h2>
    <p>{copy.passwordChangeIntro}</p><p>{copy.passwordChangeEffect}</p>
    <Button variant="secondary" disabled={busy} onClick={() => void act({ action: "logout" })}>{copy.freshSignIn}</Button>
    {error ? <p ref={feedback} id="staff-password-validation" tabIndex={-1} role="alert" className="field-message field-message--error">{copy.errors[error.kind]}</p> : null}
    <form ref={form} onSubmit={submit} aria-busy={busy} noValidate>
      <FormField id="staff-new-password" name="password" label={copy.newPassword} type="password" hint={copy.passwordHint} autoComplete="new-password" required disabled={busy} aria-invalid={error ? true : undefined} aria-describedby={error ? "staff-password-validation" : undefined} />
      <FormField id="staff-password-confirmation" name="passwordConfirmation" label={copy.passwordConfirmation} type="password" autoComplete="new-password" required disabled={busy} aria-invalid={error ? true : undefined} aria-describedby={error ? "staff-password-validation" : undefined} />
      <Button type="submit" disabled={busy}>{copy.changePassword}</Button>
    </form>
  </section>;
}
