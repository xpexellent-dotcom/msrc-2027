"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Checkbox } from "@/components/forms/checkbox";
import { FormField } from "@/components/forms/form-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";
import type { RegistrationResponse } from "./contracts";
import { normalizeIdentityNumber, type IdentityDocumentType } from "./identity-number";
import { registrationCopy } from "./registration-copy";
import { myRegistrationCopy } from "./my-registration-copy";

export function RegistrationForm({ locale, initial, onSubmitted }: { locale: Locale; initial: RegistrationResponse; onSubmitted?: () => void }) {
  const copy = registrationCopy[locale];
  const [result, setResult] = useState(initial);
  const [documentType, setDocumentType] = useState<IdentityDocumentType>("national_id");
  const [documentNumber, setDocumentNumber] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [checking, setChecking] = useState(initial.state === "denied");
  const [statusRefresh, setStatusRefresh] = useState(0);
  const summary = useRef<HTMLDivElement>(null);
  const [summaryFocus, setSummaryFocus] = useState(0);
  const submitted = result.state === "submitted";
  const numberHint = documentType === "passport" ? copy.passportNumberHint : copy.nationalNumberHint;
  const error = result.state === "invalid_input" ? copy.invalid : result.state === "closed" ? copy.closed
    : result.state === "denied" ? copy.denied : result.state === "area-not-ready" ? copy.areaNotReady
    : result.state === "limited" ? copy.limited : result.state === "unavailable" ? copy.unavailable : null;
  useEffect(() => { const timer = setTimeout(() => setTokenReady(true), 2_100); return () => clearTimeout(timer); }, [attempt]);
  // Focus the result only after it is in the DOM: the empty summary is display:none, and a
  // requestAnimationFrame could run before React committed the message, silently dropping focus.
  useLayoutEffect(() => { if (summaryFocus) summary.current?.focus(); }, [summaryFocus]);
  useEffect(() => {
    if (initial.state !== "denied" && statusRefresh === 0) return;
    const controller = new AbortController();
    fetch("/api/workflows/registration?locale=" + locale, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const value = await response.json() as RegistrationResponse & { error?: unknown };
        if (controller.signal.aborted) return;
        if (response.ok && ["ready", "submitted"].includes(value.state) && typeof value.formToken === "string" && typeof value.termsVersion === "string") setResult(value);
        else setResult({ state: value.state === "denied" ? "denied" : value.state === "area-not-ready" ? "area-not-ready" : value.error ? "closed" : "unavailable" });
        setTokenReady(false); setAttempt((value) => value + 1); setChecking(false);
      }).catch(() => { if (!controller.signal.aborted) { setResult({ state: "unavailable" }); setChecking(false); } });
    return () => controller.abort();
  }, [initial.state, locale, statusRefresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !tokenReady || !result.formToken || !accepted) return;
    setPending(true);
    try {
      const response = await fetch("/api/workflows/registration", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentType, documentNumber, termsAccepted: accepted,
          termsVersion: result.termsVersion, formToken: result.formToken, website: "" }) });
      const value: unknown = await response.json();
      const observed = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
      const state = observed?.state;
      if (response.status === 503 && observed?.error) setResult({ ...result, state: "closed" });
      else if (typeof state === "string" && ["ready", "submitted", "closed", "denied", "area-not-ready", "invalid_input", "unavailable", "limited"].includes(state)) {
        setResult({ state: state as RegistrationResponse["state"], formToken: state === "area-not-ready" ? undefined : typeof observed?.formToken === "string" ? observed.formToken : result.formToken,
          termsVersion: result.termsVersion });
        if (state === "submitted") { setDocumentNumber(""); setAccepted(false); onSubmitted?.(); }
      } else setResult({ ...result, state: "unavailable" });
    } catch { setResult({ ...result, state: "unavailable" }); }
    finally {
      setPending(false); setTokenReady(false); setAttempt((value) => value + 1); setSummaryFocus((value) => value + 1);
    }
  }
  return <div className="participant-account-card" data-testid="registration-request" dir={locale === "ar" ? "rtl" : "ltr"}>
    <div ref={summary} tabIndex={-1} role={!checking && error ? "alert" : "status"} className={!checking && error ? "participant-account-error" : "participant-account-feedback"}>
      {checking ? <p>{copy.checking}</p> : submitted ? <p className="participant-account-status">{copy.confirmation}</p> : error ? <><h2>{copy.errorTitle}</h2><p>{error}</p></> : null}
    </div>
    {!checking && result.state === "denied" ? <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : null}
    {!checking && submitted ? <ButtonLink href={`/${locale}/registration`} variant="secondary">{myRegistrationCopy[locale].title}</ButtonLink> : null}
    {!checking && ["unavailable", "area-not-ready"].includes(result.state) && !result.formToken ? <Button onClick={() => { setChecking(true); setStatusRefresh((value) => value + 1); }}>{copy.retry}</Button> : null}
    {!checking && !submitted && result.formToken && result.termsVersion && !["closed", "denied", "area-not-ready"].includes(result.state) ? <form onSubmit={submit}>
      <fieldset className="participant-account-fields" disabled={pending}>
        <legend className="sr-only">{copy.title}</legend>
        <div className="field"><label className="field-label" htmlFor="registration-document-type">{copy.documentType}</label>
          <select id="registration-document-type" className="field-input" required value={documentType} onChange={(event) => setDocumentType(event.target.value as IdentityDocumentType)}>
            <option value="national_id">{copy.nationalId}</option><option value="iqama">{copy.iqama}</option><option value="passport">{copy.passport}</option>
          </select>
        </div>
        <FormField id="registration-document-number" label={copy.documentNumber} hint={`${copy.documentHint} ${numberHint}`} required dir="ltr" autoComplete="off"
          error={result.state === "invalid_input" && !normalizeIdentityNumber(documentType, documentNumber) ? numberHint : undefined}
          inputMode={documentType === "passport" ? "text" : "numeric"} spellCheck={false} maxLength={40} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} />
        <Checkbox id="registration-terms" label={copy.termsAccepted} required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <p className="registration-photography-notice" data-testid="registration-photography-notice">{copy.photography}</p>
        <Link href={`/${locale}/terms/${result.termsVersion}`}>{copy.termsLink}</Link>
        <Link href={`/${locale}/privacy`}>{copy.privacyLink}</Link>
      </fieldset>
      <div className="participant-account-actions"><Button type="submit" loading={pending} loadingLabel={copy.sending} disabled={!tokenReady || !accepted || !result.formToken}>{copy.submit}</Button></div>
    </form> : null}
  </div>;
}
