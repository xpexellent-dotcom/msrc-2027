"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/forms/checkbox";
import { currentTermsVersion } from "@/config/policies";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { myRegistrationCopy } from "@/features/registration/my-registration-copy";
import type { ParticipantAnnouncementsResponse } from "@/features/announcements/participant-contracts";
import type { WorkshopParticipantResponse } from "@/features/workshops/participant-contracts";
import type { Locale } from "@/lib/i18n";
import type { ParticipantAction, ParticipantField, ParticipantPageState, ParticipantPayload, ParticipantProfile, ParticipantResponse, ParticipantState } from "./contracts";
import { participantCopy, type ParticipantScreen } from "./participant-copy";
import { requestAccount } from "./participant-client";
import { beginParticipantAction, finishParticipantAction, hasPendingParticipantLogout, normalizeParticipantCode, updateParticipantDraft, useParticipantDraft } from "./participant-draft";
import { ParticipantDashboard } from "./participant-dashboard";

const fields: ParticipantField[] = ["firstName", "lastName", "email", "password", "confirmPassword", "code", "ageConfirmed"];
const failedStates = new Set<ParticipantState>(["invalid_input", "invalid_credentials", "invalid_code", "limited", "unavailable", "closed"]);
const minimumFillMs = 2_000;

function timestamp(value: string | null) { const parsed = value ? Date.parse(value) : NaN; return Number.isFinite(parsed) ? parsed : null; }
/** Remaining time as m:ss in the page locale's digits. */
function countdown(milliseconds: number, locale: Locale) {
  const total = Math.max(0, Math.ceil(milliseconds / 1_000));
  const digits = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", { useGrouping: false });
  const seconds = total % 60;
  return `${digits.format(Math.floor(total / 60))}:${seconds < 10 ? digits.format(0) : ""}${digits.format(seconds)}`;
}

export function ParticipantAccountForm({ locale, screen, initialState, profileEnabled = false, registrationAvailable = false, abstractsAvailable = false, competitionsAvailable = false, workshopsAvailable = false, certificatesAvailable = false, researchJudgingAvailable = false, initialAnnouncements, initialWorkshopBookings }: { locale: Locale; screen: ParticipantScreen; initialState: ParticipantPageState; profileEnabled?: boolean; registrationAvailable?: boolean; abstractsAvailable?: boolean; competitionsAvailable?: boolean; workshopsAvailable?: boolean; certificatesAvailable?: boolean; researchJudgingAvailable?: boolean; initialAnnouncements?: ParticipantAnnouncementsResponse; initialWorkshopBookings?: WorkshopParticipantResponse }) {
  const copy = participantCopy[locale];
  const draft = useParticipantDraft();
  // A completion can land in the prior locale's unmounted form. Observe its
  // shared outcome here, and cancel any status read from before the mutation.
  const authenticationStatusRefresh = draft.outcome === "authenticated" || draft.outcome === "signed_out" || draft.outcome === "password_reset"
    || draft.action === "logout" && draft.outcome === "unavailable" ? draft.outcomeSequence : 0;
  const [availability, setAvailability] = useState<"checking" | "ready" | "closed" | "unavailable">(initialState.profile ? "ready" : "checking");
  const [profile, setProfile] = useState<ParticipantProfile | null>(initialState.profile);
  const [formToken, setFormToken] = useState<string | null>(screen === "my-msrc" ? initialState.formToken ?? null : null);
  const [tokenUsableAt, setTokenUsableAt] = useState<number | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [signingIn, setSigningIn] = useState(false);
  const [signedInAfterVerify, setSignedInAfterVerify] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const outcome = useRef<HTMLParagraphElement>(null);
  const lastOutcome = useRef(draft.outcomeSequence);
  const mounted = useRef(false);
  const statusRequest = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const notice = initialState.notice;
  const needsName = screen === "sign-up";
  const needsCode = screen === "verify-email" || screen === "reset-password";
  const needsPassword = needsName || screen === "sign-in" || needsCode;
  const newPassword = screen === "sign-up" || screen === "reset-password";
  const complete = (screen === "verify-email" && draft.outcome === "verified") || (screen === "reset-password" && draft.outcome === "password_reset");
  const signedIn = screen === "sign-in" && profile !== null && availability === "ready";
  const hasCodeRequest = draft.requestId !== null && draft.purpose === (screen === "reset-password" ? "recovery" : "verification");
  // ENG-084: arriving from sign-up, the email and password are already in memory; show only the code.
  const carried = screen === "verify-email" && draft.fromSignup && hasCodeRequest && draft.email !== "" && draft.password !== "";
  const expiredAt = timestamp(hasCodeRequest ? draft.expiresAt : null);
  const resendAt = timestamp(draft.resendAvailableAt);
  const codeExpired = expiredAt !== null && expiredAt <= now;
  const waiting = (tokenUsableAt !== null && tokenUsableAt > now) || (retryAt !== null && retryAt > now);
  const disabled = availability !== "ready" || !formToken || draft.pending || waiting;
  const signOutDisabled = availability !== "ready" || !profile || !formToken || draft.pending || (retryAt !== null && retryAt > now);
  const frozen = availability !== "ready" || !formToken || draft.pending;
  const errorState = draft.outcome && failedStates.has(draft.outcome) ? draft.outcome : null;
  const activeFields = fields.filter((field) => field === "email" || ((field === "firstName" || field === "lastName" || field === "confirmPassword" || field === "ageConfirmed") && needsName) || (field === "password" && needsPassword) || (field === "code" && needsCode));

  useEffect(() => {
    mounted.current = true;
    async function restore() {
      if (statusRequest.current || hasPendingParticipantLogout()) return;
      const controller = new AbortController();
      statusRequest.current = controller;
      const { response: result, receivedAt } = await requestAccount(undefined, controller.signal);
      if (statusRequest.current === controller) statusRequest.current = null;
      if (controller.signal.aborted) return;
      setAvailability(result.state === "closed" ? "closed" : result.state === "ready" || result.state === "authenticated" ? "ready" : "unavailable");
      setProfile(result.profile ?? null);
      setFormToken(result.formToken ?? null);
      setTokenUsableAt(screen !== "my-msrc" && result.formToken ? receivedAt + minimumFillMs : null);
      setNow(receivedAt);
      if (result.state === "closed") updateParticipantDraft({ ageConfirmed: false });
    }
    void restore();
    const recover = (event: PageTransitionEvent) => { if (event.persisted) void restore(); };
    window.addEventListener("pageshow", recover);
    const interval = screen === "my-msrc" ? window.setInterval(() => { if (document.visibilityState === "visible") void restore(); }, 60_000) : null;
    return () => {
      mounted.current = false;
      statusRequest.current?.abort();
      statusRequest.current = null;
      window.removeEventListener("pageshow", recover);
      if (interval !== null) window.clearInterval(interval);
    };
  }, [screen, statusRefresh, authenticationStatusRefresh]);

  useEffect(() => {
    const current = Date.now();
    const boundary = [tokenUsableAt, retryAt, resendAt, expiredAt].filter((value): value is number => value !== null && value > current).sort((first, second) => first - second)[0];
    if (boundary === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(boundary - current + 1, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [tokenUsableAt, retryAt, resendAt, expiredAt, now]);

  const counting = needsCode && ((expiredAt !== null && expiredAt > now) || (resendAt !== null && resendAt > now));
  useEffect(() => {
    if (!counting) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [counting]);

  // ENG-083: the code is already on its way, so continue straight to verification
  // through the client-side link (the in-memory draft keeps the email and password).
  useEffect(() => {
    if (signedInAfterVerify) document.querySelector<HTMLAnchorElement>("[data-testid=participant-continue-profile]")?.click();
  }, [signedInAfterVerify]);
  useEffect(() => {
    if (screen === "sign-up" && draft.outcome === "accepted") document.querySelector<HTMLAnchorElement>("[data-testid=participant-continue-verify]")?.click();
  }, [screen, draft.outcome, draft.outcomeSequence]);

  useEffect(() => {
    if (lastOutcome.current === draft.outcomeSequence) return;
    lastOutcome.current = draft.outcomeSequence;
    if (draft.outcome && failedStates.has(draft.outcome)) summary.current?.focus();
    else if (draft.outcome === "accepted" && needsCode) document.getElementById("participant-code")?.focus();
    else outcome.current?.focus();
  }, [draft.outcomeSequence, draft.outcome, needsCode]);

  function fieldError(field: ParticipantField) {
    // The server validates the combined name; show its error on the first-name field.
    const error = draft.fieldErrors?.[field] ?? (field === "firstName" ? draft.fieldErrors?.name : undefined);
    if (!error) return undefined;
    if (field === "ageConfirmed") return copy.ageRequired;
    if (field === "confirmPassword" && error === "invalid") return copy.passwordMismatch;
    if (error === "required") return copy.required;
    if (error === "too_long") return field === "password" && screen !== "sign-in" ? copy.passwordTooLong : copy.tooLong;
    if (field === "password" && screen !== "sign-in") return copy.invalidPassword;
    return field === "email" ? copy.invalidEmail : field === "code" ? draft.outcome === "invalid_code" ? copy.codeNotVerified : copy.invalidCode : copy.invalidField;
  }
  function edit(field: Exclude<ParticipantField, "ageConfirmed">, value: string) { updateParticipantDraft({ [field]: field === "code" ? normalizeParticipantCode(value) : value, outcome: null, fieldErrors: {} }); }

  async function handleAction(action: ParticipantAction, validate = true) {
    if (action === "logout" ? signOutDisabled : disabled) return;
    const generation = beginParticipantAction(action);
    if (generation === null) return;
    if (action === "logout") {
      statusRequest.current?.abort();
      statusRequest.current = null;
    }
    if (validate) {
      const errors: ParticipantResponse["fieldErrors"] = {};
      const validatedFields: ParticipantField[] = action === "forgot" ? ["email"] : action === "resend" ? ["email", "password"] : activeFields;
      for (const field of validatedFields) {
        if (field === "ageConfirmed") { if (draft.ageConfirmed !== true) errors.ageConfirmed = "required"; continue; }
        const value = draft[field];
        if (!value || (field !== "password" && !value.trim())) errors[field] = "required";
        else if (field === "code" && !/^\d{6}$/.test(value)) errors[field] = "invalid";
        else if (field === "email" && form.current?.querySelector<HTMLInputElement>("input[type=email]")?.validity.typeMismatch) errors[field] = "invalid";
        else if (field === "confirmPassword" && value !== draft.password) errors[field] = "invalid";
      }
      if (Object.keys(errors).length) { finishParticipantAction(generation, { outcome: "invalid_input", fieldErrors: errors }); return; }
    }
    const website = form.current?.elements.namedItem("website");
    const payload: ParticipantPayload = { action, formToken: formToken!, website: website instanceof HTMLInputElement ? website.value : "" };
    const fullName = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
    if (action !== "logout") Object.assign(payload, { name: action === "signup" ? fullName : draft.name, email: draft.email, password: draft.password, code: draft.code, requestId: draft.requestId ?? undefined });
    if (action === "signup") payload.ageConfirmed = draft.ageConfirmed;
    const { response, receivedAt } = await requestAccount(payload);
    const clearing = ["authenticated", "verified", "password_reset", "signed_out", "closed"].includes(response.state);
    const applied = finishParticipantAction(generation, {
      outcome: response.state, fieldErrors: response.fieldErrors ?? {},
      ...(response.state === "accepted" ? { code: "", requestId: response.requestId ?? null, expiresAt: response.expiresAt ?? null, resendAvailableAt: response.resendAvailableAt ?? null, purpose: action === "forgot" ? "recovery" : "verification" } : {}),
      ...(clearing ? { fromSignup: false, password: "", confirmPassword: "", code: "", ageConfirmed: false, requestId: null, expiresAt: null, resendAvailableAt: null } : {}),
      ...(response.state === "signed_out" || response.state === "closed" ? { name: "", firstName: "", lastName: "", email: "" } : {}),
      ...(response.state === "accepted" ? { fromSignup: action === "signup" } : {}),
      ...(response.state === "accepted" && action === "signup" ? { confirmPassword: "" } : {}),
    });
    if (!applied || !mounted.current) return;
    setFormToken(response.formToken ?? null);
    setTokenUsableAt(screen !== "my-msrc" && response.formToken ? receivedAt + minimumFillMs : null);
    setRetryAt(response.retryAfterSeconds ? receivedAt + response.retryAfterSeconds * 1_000 : null);
    setNow(receivedAt);
    if (response.state === "closed") setAvailability("closed");
    if (response.state === "authenticated" || response.state === "signed_out" || response.state === "password_reset"
      || action === "logout" && response.state === "unavailable") setProfile(response.profile ?? null);
    if (!response.formToken) setStatusRefresh((value) => value + 1);
    if (action === "verify" && response.state === "verified" && response.formToken && payload.email && payload.password) {
      const credentials = { email: payload.email, password: payload.password, formToken: response.formToken };
      setSigningIn(true);
      // The server accepts a form token only after its short minimum fill time.
      window.setTimeout(() => void (async () => {
        const { response: signedIn } = await requestAccount({ action: "signin", website: "", ...credentials });
        if (signedIn.state === "authenticated") { if (mounted.current) setSignedInAfterVerify(true); return; }
        // Otherwise the verified message and its Sign in link remain.
        if (mounted.current) { setSigningIn(false); if (signedIn.formToken) { setFormToken(signedIn.formToken); setTokenUsableAt(Date.now() + minimumFillMs); } }
      })(), minimumFillMs + 100);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action: ParticipantAction = screen === "sign-up" ? "signup" : screen === "sign-in" ? "signin" : screen === "verify-email" ? "verify" : screen === "forgot-password" ? "forgot" : "reset";
    void handleAction(action);
  }
  const signingOut = draft.pending && draft.action === "logout";
  const dashboardReady = screen === "my-msrc" && profile !== null && availability === "ready" && !signingOut && draft.outcome !== "signed_out";
  const navigation: ParticipantScreen[] = dashboardReady ? [] : signedIn ? registrationAvailable ? ["my-msrc"] : [] : screen === "sign-up" ? ["sign-in"] : screen === "sign-in" ? ["sign-up", "forgot-password", "verify-email"] : screen === "forgot-password" ? ["reset-password", "sign-in"] : screen === "verify-email" ? ["sign-in"] : screen === "reset-password" ? ["forgot-password", "sign-in"] : ["sign-in"];

  if (availability === "closed") return <section className="participant-account-card" data-testid="participant-accounts-closed"><h2>{copy.comingSoon}</h2><p>{copy.closed}</p><ButtonLink href={`/${locale}/participate`}>{copy.explore}</ButtonLink></section>;
  return <div className={dashboardReady ? "participant-account-card participant-dashboard-shell" : "participant-account-card"} data-testid="participant-account-panel">
    <div className="participant-account-feedback">
      {errorState ? <div ref={summary} role="alert" tabIndex={-1} className="participant-account-error" data-testid="participant-account-error">
        <h2>{copy.errorsTitle}</h2><p>{copy.states[errorState]}</p>
        {activeFields.some((field) => draft.fieldErrors?.[field]) ? <ul>{activeFields.filter((field) => draft.fieldErrors?.[field]).map((field) => <li key={field}><a href={`#participant-${field}`} onClick={(event) => { event.preventDefault(); document.getElementById(`participant-${field}`)?.focus(); }}>{field === "password" && newPassword ? copy.newPassword : copy[field]}</a></li>)}</ul> : null}
      </div> : null}
      <p ref={outcome} role="status" aria-live="polite" aria-atomic="true" tabIndex={-1} className="participant-account-status" data-testid="participant-account-status">{signingIn ? copy.signingIn : draft.pending ? copy.pending : availability === "checking" ? copy.checking : availability === "unavailable" ? copy.states.unavailable : carried && draft.outcome === "accepted" ? "" : !errorState && draft.outcome ? copy.states[draft.outcome] : ""}</p>
    </div>
    {screen === "my-msrc" ? <>
      {dashboardReady ? <ParticipantDashboard locale={locale} profile={profile} profileEnabled={profileEnabled}
        registrationAvailable={registrationAvailable} abstractsAvailable={abstractsAvailable}
        competitionsAvailable={competitionsAvailable} workshopsAvailable={workshopsAvailable}
        certificatesAvailable={certificatesAvailable} researchJudgingAvailable={researchJudgingAvailable}
        announcements={initialAnnouncements} workshopBookings={initialWorkshopBookings} pending={draft.pending}
        signOutDisabled={signOutDisabled} onSignOut={() => void handleAction("logout", false)} /> : availability === "ready" && !signingOut ? <p data-testid="participant-signin-required">{copy.needSignIn}</p> : null}
    </> : signedIn ? <ButtonLink className="participant-account-primary-next" href={`/${locale}/${registrationAvailable ? "registration" : "my-msrc"}`}>{registrationAvailable ? myRegistrationCopy[locale].title : copy.links["my-msrc"]}</ButtonLink>
      : screen === "sign-up" && !notice ? <p className="participant-account-notice" data-testid="participant-privacy-pending">{copy.privacyPending}</p> : complete ? signedInAfterVerify ? <ButtonLink href={`/${locale}/my-msrc`} data-testid="participant-continue-profile">{copy.links["my-msrc"]}</ButtonLink> : signingIn ? null : <ButtonLink href={`/${locale}/sign-in`}>{copy.signIn}</ButtonLink> : <>
      {screen === "sign-up" && notice ? <aside className="participant-account-notice" aria-labelledby="participant-privacy-title">
        <h2 id="participant-privacy-title">{copy.privacy}</h2><p>{notice.summary}</p>
        <p>{copy.privacyVersion}: <bdi dir="ltr" data-testid="participant-privacy-version">{notice.version}</bdi></p>
        <Link href={notice.url}>{copy.privacyLink}</Link>
        <p><Link href={`/${locale}/terms/${currentTermsVersion}`}>{copy.termsLink}</Link></p>
      </aside> : null}
      {screen === "verify-email" && hasCodeRequest && draft.email ? <p className="participant-account-notice" data-testid="participant-code-sent">{copy.codeSent} <bdi dir="ltr">{draft.email}</bdi>{carried ? <><br /><Link href={`/${locale}/sign-up`}>{copy.differentEmail}</Link></> : null}</p> : null}
      {needsCode && !hasCodeRequest ? <p className="participant-account-notice" data-testid="participant-code-restart">{screen === "verify-email" ? copy.verificationRestart : copy.recoveryRestart}</p> : null}
      <form ref={form} onSubmit={submit} noValidate aria-label={copy.titles[screen]} aria-busy={draft.pending}>
        <fieldset className="participant-account-fields" disabled={frozen}>
          {needsName ? <div className="participant-name-fields">
            <p id="participant-signup-name-hint" className="field-hint">{copy.signupNameHint}</p>
            <div className="participant-name-row">
              <FormField id="participant-firstName" name="firstName" label={copy.firstName} value={draft.firstName} onChange={(event) => edit("firstName", event.target.value)} autoComplete="given-name" dir="auto" maxLength={60} error={fieldError("firstName")} aria-describedby="participant-signup-name-hint" required />
              <FormField id="participant-lastName" name="lastName" label={copy.lastName} value={draft.lastName} onChange={(event) => edit("lastName", event.target.value)} autoComplete="family-name" dir="auto" maxLength={59} error={fieldError("lastName")} aria-describedby="participant-signup-name-hint" required />
            </div>
          </div> : null}
          {!carried ? <FormField id="participant-email" name="email" type="email" label={copy.email} value={draft.email} onChange={(event) => edit("email", event.target.value)} autoComplete={screen === "sign-in" ? "username" : "email"} dir="ltr" spellCheck={false} autoCapitalize="none" error={fieldError("email")} required /> : null}
          {needsCode ? <FormField id="participant-code" name="code" label={copy.code} hint={copy.codeHint} value={draft.code} onChange={(event) => edit("code", event.target.value)} inputMode="numeric" autoComplete="one-time-code" dir="ltr" spellCheck={false} maxLength={6} error={fieldError("code")} required /> : null}
          {needsPassword && !carried ? <FormField id="participant-password" name="password" type="password" label={newPassword ? copy.newPassword : copy.password} hint={screen !== "sign-in" ? copy.passwordHint : undefined} value={draft.password} onChange={(event) => edit("password", event.target.value)} autoComplete={newPassword ? "new-password" : "current-password"} dir="ltr" error={fieldError("password")} required /> : null}
          {needsName ? <FormField id="participant-confirmPassword" name="confirmPassword" type="password" label={copy.confirmPassword} value={draft.confirmPassword} onChange={(event) => edit("confirmPassword", event.target.value)} autoComplete="new-password" dir="ltr" error={fieldError("confirmPassword")} required /> : null}
          {needsName ? <div className="participant-age-confirmation"><Checkbox id="participant-ageConfirmed" name="ageConfirmed" label={copy.ageConfirmed} checked={draft.ageConfirmed}
            // At enlarged text sizes the label wraps below the checkbox. Native
            // input focus alone can leave the declaration outside the viewport.
            onFocus={(event) => event.currentTarget.labels?.[0]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })}
            onChange={(event) => updateParticipantDraft({ ageConfirmed: event.target.checked, outcome: null, fieldErrors: {} })} error={fieldError("ageConfirmed")} style={{ alignSelf: "flex-start" }} required /></div> : null}
          <div className="participant-account-trap" aria-hidden="true"><label htmlFor="participant-website">Website</label><input id="participant-website" name="website" autoComplete="off" tabIndex={-1} /></div>
        </fieldset>
        {needsCode && expiredAt !== null ? <p className="participant-account-time" data-testid="participant-code-expiry">{codeExpired ? copy.expired : <>{copy.expiresIn} <time dateTime={draft.expiresAt!}><bdi dir="ltr">{countdown(expiredAt - now, locale)}</bdi></time></>}</p> : null}
        {needsCode && resendAt !== null && resendAt > now ? <p className="participant-account-time" data-testid="participant-resend-wait">{copy.resendIn} <time dateTime={draft.resendAvailableAt!}><bdi dir="ltr">{countdown(resendAt - now, locale)}</bdi></time></p> : null}
        <div className="participant-account-actions">
          <Button type="submit" disabled={disabled || (needsCode && (codeExpired || !hasCodeRequest))}>{screen === "sign-up" ? copy.create : screen === "sign-in" ? copy.signIn : screen === "verify-email" ? copy.verify : screen === "forgot-password" ? copy.requestReset : copy.reset}</Button>
          {needsCode ? <Button variant="secondary" disabled={disabled || (resendAt !== null && resendAt > now)} onClick={() => void handleAction(screen === "reset-password" ? "forgot" : "resend")}>{copy.resend}</Button> : null}
          {draft.outcome === "accepted" && screen === "sign-up" ? <ButtonLink href={`/${locale}/verify-email`} data-testid="participant-continue-verify">{copy.verify}</ButtonLink> : null}
          {draft.outcome === "accepted" && screen === "forgot-password" ? <ButtonLink href={`/${locale}/reset-password`}>{copy.links["reset-password"]}</ButtonLink> : null}
        </div>
      </form>
    </>}
    {availability === "unavailable" ? <div className="participant-account-actions"><Button variant="secondary" onClick={() => { setAvailability("checking"); setStatusRefresh((value) => value + 1); }}>{copy.retry}</Button></div> : null}
    {screen === "sign-in" && !signedIn ? <aside className="participant-signup-callout" aria-labelledby="participant-signup-callout-title" data-testid="participant-signup-callout">
      <div><h2 id="participant-signup-callout-title">{copy.newHere}</h2><p>{copy.newHereBody}</p></div>
      <ButtonLink href={`/${locale}/sign-up`} variant="gold">{copy.signUp}</ButtonLink>
    </aside> : null}
    {navigation.length ? <nav className="participant-account-navigation" aria-label={copy.navigation}>{navigation.map((destination) => <Link key={destination} href={`/${locale}/${destination}`}>{copy.links[destination]}</Link>)}</nav> : null}
  </div>;
}
