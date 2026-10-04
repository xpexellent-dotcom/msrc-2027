"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { Locale } from "@/lib/i18n";
import type { ParticipantAction, ParticipantField, ParticipantPageState, ParticipantPayload, ParticipantProfile, ParticipantResponse, ParticipantState } from "./contracts";
import { participantCopy, type ParticipantScreen } from "./participant-copy";
import { requestAccount } from "./participant-client";
import { beginParticipantAction, finishParticipantAction, normalizeParticipantCode, updateParticipantDraft, useParticipantDraft } from "./participant-draft";

const fields: ParticipantField[] = ["name", "email", "password", "code"];
const failedStates = new Set<ParticipantState>(["invalid_input", "invalid_credentials", "invalid_code", "limited", "unavailable", "closed"]);
const minimumFillMs = 2_000;

function timestamp(value: string | null) { const parsed = value ? Date.parse(value) : NaN; return Number.isFinite(parsed) ? parsed : null; }
function formattedTime(value: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Riyadh" }).format(value);
}

export function ParticipantAccountForm({ locale, screen, initialState }: { locale: Locale; screen: ParticipantScreen; initialState: ParticipantPageState }) {
  const copy = participantCopy[locale];
  const draft = useParticipantDraft();
  // A completion can land in the prior locale's unmounted form. Observe its
  // shared outcome here, and cancel any status read from before the mutation.
  const authenticationStatusRefresh = draft.outcome === "authenticated" || draft.outcome === "signed_out" || draft.outcome === "password_reset" ? draft.outcomeSequence : 0;
  const [availability, setAvailability] = useState<"checking" | "ready" | "closed" | "unavailable">("checking");
  const [profile, setProfile] = useState<ParticipantProfile | null>(initialState.profile);
  const [formToken, setFormToken] = useState<string | null>(null);
  const [tokenUsableAt, setTokenUsableAt] = useState<number | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const summary = useRef<HTMLDivElement>(null);
  const outcome = useRef<HTMLParagraphElement>(null);
  const lastOutcome = useRef(draft.outcomeSequence);
  const mounted = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const notice = initialState.notice;
  const needsName = screen === "sign-up";
  const needsCode = screen === "verify-email" || screen === "reset-password";
  const needsPassword = needsName || screen === "sign-in" || needsCode;
  const newPassword = screen === "sign-up" || screen === "reset-password";
  const complete = (screen === "verify-email" && draft.outcome === "verified") || (screen === "reset-password" && draft.outcome === "password_reset");
  const expiredAt = timestamp(draft.expiresAt);
  const resendAt = timestamp(draft.resendAvailableAt);
  const codeExpired = expiredAt !== null && expiredAt <= now;
  const waiting = (tokenUsableAt !== null && tokenUsableAt > now) || (retryAt !== null && retryAt > now);
  const disabled = availability !== "ready" || !formToken || draft.pending || waiting;
  const frozen = availability !== "ready" || !formToken || draft.pending;
  const errorState = draft.outcome && failedStates.has(draft.outcome) ? draft.outcome : null;
  const activeFields = fields.filter((field) => field === "email" || (field === "name" && needsName) || (field === "password" && needsPassword) || (field === "code" && needsCode));

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    async function restore() {
      const { response: result, receivedAt } = await requestAccount(undefined, controller.signal);
      if (controller.signal.aborted) return;
      setAvailability(result.state === "closed" ? "closed" : result.state === "ready" || result.state === "authenticated" ? "ready" : "unavailable");
      setProfile(result.profile ?? null);
      setFormToken(result.formToken ?? null);
      setTokenUsableAt(result.formToken ? receivedAt + minimumFillMs : null);
      setNow(receivedAt);
    }
    void restore();
    const recover = (event: PageTransitionEvent) => { if (event.persisted) void restore(); };
    window.addEventListener("pageshow", recover);
    const interval = screen === "my-msrc" ? window.setInterval(() => { if (document.visibilityState === "visible") void restore(); }, 60_000) : null;
    return () => { mounted.current = false; controller.abort(); window.removeEventListener("pageshow", recover); if (interval !== null) window.clearInterval(interval); };
  }, [screen, statusRefresh, authenticationStatusRefresh]);

  useEffect(() => {
    const current = Date.now();
    const boundary = [tokenUsableAt, retryAt, resendAt, expiredAt].filter((value): value is number => value !== null && value > current).sort((first, second) => first - second)[0];
    if (boundary === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(boundary - current + 1, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [tokenUsableAt, retryAt, resendAt, expiredAt, now]);

  useEffect(() => {
    if (lastOutcome.current === draft.outcomeSequence) return;
    lastOutcome.current = draft.outcomeSequence;
    if (draft.outcome && failedStates.has(draft.outcome)) summary.current?.focus();
    else if (draft.outcome === "accepted" && needsCode) document.getElementById("participant-code")?.focus();
    else outcome.current?.focus();
  }, [draft.outcomeSequence, draft.outcome, needsCode]);

  function fieldError(field: ParticipantField) {
    const error = draft.fieldErrors?.[field];
    if (!error) return undefined;
    if (error === "required") return copy.required;
    if (error === "too_long") return field === "password" && screen !== "sign-in" ? copy.passwordTooLong : copy.tooLong;
    if (field === "password" && screen !== "sign-in") return copy.invalidPassword;
    return field === "email" ? copy.invalidEmail : field === "code" ? copy.invalidCode : copy.invalidField;
  }
  function edit(field: ParticipantField, value: string) { updateParticipantDraft({ [field]: field === "code" ? normalizeParticipantCode(value) : value, outcome: null, fieldErrors: {} }); }

  async function handleAction(action: ParticipantAction, validate = true) {
    if (disabled) return;
    const generation = beginParticipantAction();
    if (generation === null) return;
    if (validate) {
      const errors: ParticipantResponse["fieldErrors"] = {};
      const validatedFields: ParticipantField[] = action === "forgot" ? ["email"] : action === "resend" ? ["email", "password"] : activeFields;
      for (const field of validatedFields) {
        const value = draft[field];
        if (!value || (field !== "password" && !value.trim())) errors[field] = "required";
        else if (field === "code" && !/^\d{6}$/.test(value)) errors[field] = "invalid";
        else if (field === "email" && form.current?.querySelector<HTMLInputElement>("input[type=email]")?.validity.typeMismatch) errors[field] = "invalid";
      }
      if (Object.keys(errors).length) { finishParticipantAction(generation, { outcome: "invalid_input", fieldErrors: errors }); return; }
    }
    const website = form.current?.elements.namedItem("website");
    const payload: ParticipantPayload = { action, formToken: formToken!, website: website instanceof HTMLInputElement ? website.value : "" };
    if (action !== "logout") Object.assign(payload, { name: draft.name, email: draft.email, password: draft.password, code: draft.code, requestId: draft.requestId ?? undefined });
    const { response, receivedAt } = await requestAccount(payload);
    const clearing = ["authenticated", "verified", "password_reset", "signed_out", "closed"].includes(response.state);
    const applied = finishParticipantAction(generation, {
      outcome: response.state, fieldErrors: response.fieldErrors ?? {},
      ...(response.state === "accepted" ? { code: "", requestId: response.requestId ?? null, expiresAt: response.expiresAt ?? null, resendAvailableAt: response.resendAvailableAt ?? null, purpose: action === "forgot" ? "recovery" : "verification" } : {}),
      ...(clearing ? { password: "", code: "", requestId: null, expiresAt: null, resendAvailableAt: null } : {}),
      ...(response.state === "signed_out" || response.state === "closed" ? { name: "", email: "" } : {}),
    });
    if (!applied || !mounted.current) return;
    setFormToken(response.formToken ?? null);
    setTokenUsableAt(response.formToken ? receivedAt + minimumFillMs : null);
    setRetryAt(response.retryAfterSeconds ? receivedAt + response.retryAfterSeconds * 1_000 : null);
    setNow(receivedAt);
    if (response.state === "closed") setAvailability("closed");
    if (response.state === "authenticated" || response.state === "signed_out" || response.state === "password_reset") setProfile(response.profile ?? null);
    if (!response.formToken) setStatusRefresh((value) => value + 1);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action: ParticipantAction = screen === "sign-up" ? "signup" : screen === "sign-in" ? "signin" : screen === "verify-email" ? "verify" : screen === "forgot-password" ? "forgot" : "reset";
    void handleAction(action);
  }
  const navigation: ParticipantScreen[] = screen === "sign-up" ? ["sign-in"] : screen === "sign-in" ? ["sign-up", "forgot-password"] : screen === "forgot-password" ? ["reset-password", "sign-in"] : screen === "verify-email" ? ["sign-in"] : screen === "reset-password" ? ["forgot-password", "sign-in"] : ["sign-in"];

  if (availability === "closed") return <section className="participant-account-card" data-testid="participant-accounts-closed"><h2>{copy.comingSoon}</h2><p>{copy.closed}</p><ButtonLink href={`/${locale}/participate`}>{copy.explore}</ButtonLink></section>;
  return <section className="participant-account-card" data-testid="participant-account-panel">
    <div className="participant-account-feedback">
      {errorState ? <div ref={summary} role="alert" tabIndex={-1} className="participant-account-error" data-testid="participant-account-error">
        <h2>{copy.errorsTitle}</h2><p>{copy.states[errorState]}</p>
        {activeFields.some((field) => draft.fieldErrors?.[field]) ? <ul>{activeFields.filter((field) => draft.fieldErrors?.[field]).map((field) => <li key={field}><a href={`#participant-${field}`} onClick={(event) => { event.preventDefault(); document.getElementById(`participant-${field}`)?.focus(); }}>{field === "password" && newPassword ? copy.newPassword : copy[field]}</a></li>)}</ul> : null}
      </div> : null}
      <p ref={outcome} role="status" aria-live="polite" aria-atomic="true" tabIndex={-1} className="participant-account-status" data-testid="participant-account-status">{draft.pending ? copy.pending : availability === "checking" ? copy.checking : !errorState && draft.outcome ? copy.states[draft.outcome] : availability === "unavailable" ? copy.states.unavailable : ""}</p>
    </div>
    {screen === "my-msrc" ? <>
      {profile && availability === "ready" ? <>
        <dl className="participant-account-profile">
          <div><dt>{copy.profileName}</dt><dd data-testid="participant-profile-name"><bdi dir="auto">{profile.name}</bdi></dd></div>
          <div><dt>{copy.accountState}</dt><dd data-testid="participant-account-state">{copy.verifiedState}</dd></div>
        </dl>
        <p className="participant-account-registration" data-testid="participant-registration-closed">{copy.registrationClosed}</p>
        <div className="participant-account-actions"><Button variant="secondary" disabled={disabled} onClick={() => void handleAction("logout", false)}>{copy.signOut}</Button></div>
      </> : availability === "ready" ? <p data-testid="participant-signin-required">{copy.needSignIn}</p> : null}
    </> : screen === "sign-up" && !notice ? <p className="participant-account-notice" data-testid="participant-privacy-pending">{copy.privacyPending}</p> : complete ? <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : <>
      {screen === "sign-up" && notice ? <aside className="participant-account-notice" aria-labelledby="participant-privacy-title">
        <h2 id="participant-privacy-title">{copy.privacy}</h2><p>{notice.summary}</p>
        <p>{copy.privacyVersion}: <bdi dir="ltr" data-testid="participant-privacy-version">{notice.version}</bdi></p>
        <Link href={notice.url}>{copy.privacyLink}</Link>
      </aside> : null}
      <form ref={form} onSubmit={submit} noValidate aria-label={copy.titles[screen]} aria-busy={draft.pending}>
        <fieldset className="participant-account-fields" disabled={frozen}>
          {needsName ? <FormField id="participant-name" name="name" label={copy.name} value={draft.name} onChange={(event) => edit("name", event.target.value)} autoComplete="name" dir="auto" error={fieldError("name")} required /> : null}
          <FormField id="participant-email" name="email" type="email" label={copy.email} value={draft.email} onChange={(event) => edit("email", event.target.value)} autoComplete={screen === "sign-in" ? "username" : "email"} dir="ltr" spellCheck={false} autoCapitalize="none" error={fieldError("email")} required />
          {needsCode ? <FormField id="participant-code" name="code" label={copy.code} hint={copy.codeHint} value={draft.code} onChange={(event) => edit("code", event.target.value)} inputMode="numeric" autoComplete="one-time-code" dir="ltr" spellCheck={false} maxLength={6} error={fieldError("code")} required /> : null}
          {needsPassword ? <FormField id="participant-password" name="password" type="password" label={newPassword ? copy.newPassword : copy.password} hint={screen !== "sign-in" ? copy.passwordHint : undefined} value={draft.password} onChange={(event) => edit("password", event.target.value)} autoComplete={newPassword ? "new-password" : "current-password"} dir="ltr" error={fieldError("password")} required /> : null}
          <div className="participant-account-trap" aria-hidden="true"><label htmlFor="participant-website">Website</label><input id="participant-website" name="website" autoComplete="off" tabIndex={-1} /></div>
        </fieldset>
        {needsCode && expiredAt !== null ? <p className="participant-account-time">{codeExpired ? copy.expired : <>{copy.expiresAt} <time dateTime={draft.expiresAt!}>{formattedTime(expiredAt, locale)}</time></>}</p> : null}
        {needsCode && resendAt !== null && resendAt > now ? <p className="participant-account-time">{copy.waitUntil} <time dateTime={draft.resendAvailableAt!}>{formattedTime(resendAt, locale)}</time></p> : null}
        <div className="participant-account-actions">
          <Button type="submit" disabled={disabled || (needsCode && (codeExpired || !draft.requestId))}>{screen === "sign-up" ? copy.create : screen === "sign-in" ? copy.signIn : screen === "verify-email" ? copy.verify : screen === "forgot-password" ? copy.requestReset : copy.reset}</Button>
          {needsCode ? <Button variant="secondary" disabled={disabled || (resendAt !== null && resendAt > now)} onClick={() => void handleAction(screen === "reset-password" ? "forgot" : "resend")}>{copy.resend}</Button> : null}
          {draft.outcome === "accepted" && screen === "sign-up" ? <ButtonLink href={`/${locale}/verify-email`}>{copy.verify}</ButtonLink> : null}
          {draft.outcome === "accepted" && screen === "forgot-password" ? <ButtonLink href={`/${locale}/reset-password`}>{copy.links["reset-password"]}</ButtonLink> : null}
          {profile && screen === "sign-in" ? <ButtonLink href={`/${locale}/my-msrc`}>{copy.links["my-msrc"]}</ButtonLink> : null}
        </div>
      </form>
    </>}
    {availability === "unavailable" ? <div className="participant-account-actions"><Button variant="secondary" onClick={() => { setAvailability("checking"); setStatusRefresh((value) => value + 1); }}>{copy.retry}</Button></div> : null}
    <nav className="participant-account-navigation" aria-label={copy.navigation}>{navigation.map((destination) => <Link key={destination} href={`/${locale}/${destination}`}>{copy.links[destination]}</Link>)}</nav>
  </section>;
}
