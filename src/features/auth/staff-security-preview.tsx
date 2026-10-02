"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FormField } from "@/components/forms/form-field";
import { staffSecurityCopy, type StaffSecurityMessage } from "@/features/auth/staff-security-copy";
import type { PreviewAction, PreviewResult, PreviewView } from "@/features/auth/mfa-contract";
import type { Locale } from "@/lib/i18n";

type TestMessage = NonNullable<PreviewView["testMessage"]>;
type Draft = Readonly<{
  code: string;
  emailCode: string;
  view: PreviewView | null;
  smsMessage: TestMessage | null;
  emailMessage: TestMessage | null;
  result: PreviewResult | null;
  responseChannel: "sms" | "email" | null;
}>;
const emptyDraft: Draft = { code: "", emailCode: "", view: null, smsMessage: null, emailMessage: null, result: null, responseChannel: null };
let draft: Draft = emptyDraft;
const listeners = new Set<() => void>();

// LOC-01: transient inputs survive in-app locale changes. Passwords are never collected;
// test codes/messages and assurance never enter browser storage, URLs or client logs.
function updateDraft(next: Partial<Draft>) {
  draft = { ...draft, ...next };
  for (const listener of listeners) listener();
}
function subscribeDraft(listener: () => void) {
  listeners.add(listener);
  const clearOnUnload = () => updateDraft(emptyDraft);
  window.addEventListener("pagehide", clearOnUnload);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("pagehide", clearOnUnload);
  };
}
function readDraft() { return draft; }
function readServerDraft() { return emptyDraft; }

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

async function requestPreview(action: PreviewAction, signal?: AbortSignal): Promise<PreviewResult> {
  const { type, ...payload } = action;
  try {
    const response = await fetch("/api/auth-preview", {
      method: "POST", credentials: "same-origin", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: type, ...payload }),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable", code: "unavailable" };
    const result = await response.json() as PreviewResult;
    if (!["ok", "denied", "unavailable"].includes(result.state) || typeof result.code !== "string") return { state: "unavailable", code: "unavailable" };
    // This is presentation state. Every action rechecks authority on the server.
    return result;
  } catch {
    return { state: "unavailable", code: "unavailable" };
  }
}

function acceptResult(result: PreviewResult, action: PreviewAction["type"]) {
  const cleared = ["start", "logout", "suspend", "simulate-factor-reset", "reauthenticate"].includes(action) && result.state === "ok";
  const noSession = result.code === "no_session" || result.code === "logged_out";
  const clearAll = cleared || noSession || (result.view && result.view.status !== "active");
  const clearSms = clearAll || result.code === "verified" || result.code === "phone_verified";
  const clearEmail = clearAll || result.code === "email_verified";
  const message = result.view?.testMessage;
  const currentView = result.view ? { ...result.view, testMessage: undefined } : draft.view;
  updateDraft({
    // Keep test messages only in the separate transient inbox, never in status/result copies.
    result: { state: result.state, code: result.code },
    responseChannel: action === "verify-email" ? "email" : action === "verify" ? "sms" : null,
    view: noSession ? null : currentView,
    smsMessage: clearSms ? null : message?.channel === "sms" ? message : draft.smsMessage,
    emailMessage: clearEmail ? null : message?.channel === "email" ? message : draft.emailMessage,
    code: clearSms ? "" : draft.code,
    emailCode: clearEmail ? "" : draft.emailCode,
  });
}

function formatExpiry(timestamp: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory",
  }).format(new Date(timestamp));
}

function SyntheticMessage({ message, locale }: { message: TestMessage; locale: Locale }) {
  const text = staffSecurityCopy[locale];
  return (
    <section className="staff-security-test-message" aria-labelledby={`test-message-${message.channel}`}>
      <h3 id={`test-message-${message.channel}`}>{message.channel === "sms" ? text.smsMessage : text.emailMessage}</h3>
      <p>{text.messageDelivery} · {message.channel === "sms" ? text.smsDestination : text.emailDestination} <bdi dir="ltr" data-testid={`synthetic-${message.channel}-destination`}>{message.destination.replace(/^Synthetic (email|phone)\s+/, "")}</bdi></p>
      <label htmlFor={`synthetic-${message.channel}-code`}>{text.messageCode}</label>
      <output id={`synthetic-${message.channel}-code`} data-testid={`synthetic-${message.channel}-code`} className="staff-security-test-code" dir="ltr" lang="en">{message.code}</output>
      <p>{text.messageExpiry}: <time dateTime={new Date(message.expiresAt).toISOString()}>{formatExpiry(message.expiresAt, locale)}</time></p>
    </section>
  );
}

export function StaffSecurityPreview({ locale }: { locale: Locale }) {
  const text = staffSecurityCopy[locale];
  const snapshot = useSyncExternalStore(subscribeDraft, readDraft, readServerDraft);
  const { view, smsMessage, emailMessage, result, responseChannel, code, emailCode } = snapshot;
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<"sms" | "email" | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: "error" | "code" | "email" | "session"; sequence: number } | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const sessionHeading = useRef<HTMLHeadingElement>(null);
  const actionLock = useRef(false);
  const actionGeneration = useRef(0);
  const live = view?.status === "active";
  const staff = view?.kind === "staff";
  const showSmsForm = live && (staff ? view.factor !== "none" && view.assurance !== "aal2" : !view.phoneVerified);
  const smsError = validation === "sms" ? text.codeValidation : responseChannel === "sms" && result?.code === "invalid_code" ? text.messages.invalid_code : undefined;
  const emailError = validation === "email" ? text.codeValidation : responseChannel === "email" && result?.code === "invalid_code" ? text.messages.invalid_code : undefined;
  const messageKey: StaffSecurityMessage = result && result.code in text.messages ? result.code as StaffSecurityMessage : "unavailable";
  let message: string = validation ? text.codeValidation : result && result.code !== "status" ? text.messages[messageKey] : "";
  if (!validation && result) {
    if (result.code === "status" && view && view.status !== "active") message = text[view.status];
    if (result.code === "protected_allowed" && !staff) message = text.participantAllowed;
    if (result.code === "email_verified" && !view?.phoneVerified) message = text.emailVerifiedPhonePending;
    if (result.code === "reauthenticated" && !staff) message = text.participantReauthenticated;
  }
  const failed = Boolean(validation) || (Boolean(message) && result?.state !== "ok");

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      const generation = actionGeneration.current;
      const response = await requestPreview({ type: "status" }, controller.signal);
      if (!controller.signal.aborted && !actionLock.current && generation === actionGeneration.current) acceptResult(response, "status");
    }
    void checkSession();
    const restoreSession = (event: PageTransitionEvent) => { if (event.persisted) void checkSession(); };
    window.addEventListener("pageshow", restoreSession);
    // Read-only checks are not user activity and never refresh an absolute lifetime.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkSession();
    }, 60_000);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("pageshow", restoreSession); };
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === "error") summary.current?.focus();
    if (focusRequest.target === "session") sessionHeading.current?.focus();
    if (focusRequest.target === "code") document.getElementById("staff-auth-code")?.focus();
    if (focusRequest.target === "email") document.getElementById("participant-email-code")?.focus();
  }, [focusRequest]);

  async function act(action: PreviewAction) {
    if (actionLock.current) return;
    actionLock.current = true;
    actionGeneration.current += 1;
    setBusy(true);
    setValidation(null);
    const response = await requestPreview(action);
    acceptResult(response, action.type);
    setBusy(false);
    actionLock.current = false;
    const target = response.state !== "ok" ? "error" : action.type === "enroll" || action.type === "challenge" ? "code" : action.type === "challenge-email" ? "email" : "session";
    setFocusRequest((previous) => ({ target, sequence: (previous?.sequence ?? 0) + 1 }));
  }

  function verify(event: FormEvent<HTMLFormElement>, channel: "sms" | "email") {
    event.preventDefault();
    const value = channel === "sms" ? code : emailCode;
    if (!/^\d{6}$/.test(value)) {
      setValidation(channel);
      setFocusRequest((previous) => ({ target: "error", sequence: (previous?.sequence ?? 0) + 1 }));
      return;
    }
    void act({ type: channel === "sms" ? "verify" : "verify-email", code: value });
  }

  return (
    <Container className="staff-security-preview" data-testid="staff-security-preview">
      <header className="staff-security-intro">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
        <p className="staff-security-simulation" data-testid="preview-simulation">{text.simulation}</p>
        <p className="staff-security-label">{text.synthetic}</p>
      </header>

      <div className="staff-security-feedback">
        {failed && message ? <div ref={summary} className="staff-security-alert" role="alert" tabIndex={-1} data-testid="auth-error">{message}</div> : null}
        <p role="status" aria-live="polite" aria-atomic="true" data-testid="auth-status">{busy ? text.pending : !failed ? message : ""}</p>
      </div>

      <div className="staff-security-layout">
        <div className="staff-security-flow">
          <section className="staff-security-panel" aria-labelledby="staff-session-heading">
            <h2 id="staff-session-heading" ref={sessionHeading} tabIndex={-1}>{text.sessionTitle}</h2>
            <p className="staff-security-session-state" data-testid="session-state">{view ? text[view.status] : text.noSession}</p>
            {view ? <>
              <p>{staff ? text.staff : text.participantLabel}</p>
              <dl className="staff-security-facts">
                <div><dt>{text.passwordLabel}</dt><dd data-testid="password-verification">{view.passwordVerified ? text.passwordVerified : text.missing}</dd></div>
                <div><dt>{staff ? text.assuranceLabel : text.participantAssuranceLabel}</dt><dd data-testid="session-assurance">{staff ? view.assurance === "aal2" ? text.assured : text.missing : text.participantAssurance}</dd></div>
                {!staff ? <>
                  <div><dt>{text.emailLabel}</dt><dd data-testid="email-verification">{view.emailVerified ? text.verifiedStatus : text.missing}</dd></div>
                  <div><dt>{text.phoneLabel}</dt><dd data-testid="phone-verification">{view.phoneVerified ? text.verifiedStatus : text.missing}</dd></div>
                </> : null}
                <div><dt>{text.absolute}</dt><dd><time dateTime={new Date(view.absoluteExpiresAt).toISOString()} data-testid="absolute-expiry">{formatExpiry(view.absoluteExpiresAt, locale)}</time></dd></div>
                {view.idleExpiresAt !== null ? <div><dt>{text.idle}</dt><dd><time dateTime={new Date(view.idleExpiresAt).toISOString()}>{formatExpiry(view.idleExpiresAt, locale)}</time></dd></div> : null}
              </dl>
              <p className="staff-security-closed" data-testid="live-access-closed">{text.accessClosed}</p>
            </> : null}
            {!live ? <div className="staff-security-actions">
              <Button disabled={busy} onClick={() => void act({ type: "start", kind: "staff" })}>{view ? text.restart : text.start}</Button>
              <Button disabled={busy} variant="secondary" onClick={() => void act({ type: "start", kind: "participant" })}>{text.participant}</Button>
            </div> : null}
          </section>

          {live && staff && view.factor === "none" ? <section className="staff-security-panel" aria-labelledby="staff-sms-heading">
            <h2 id="staff-sms-heading">{text.setupTitle}</h2>
            <p>{text.setupIntro}</p>
            <Button disabled={busy} onClick={() => void act({ type: "enroll" })}>{text.enroll}</Button>
          </section> : null}

          {live && !staff ? <section className="staff-security-panel" aria-labelledby="participant-verification-heading">
            <h2 id="participant-verification-heading">{text.verificationTitle}</h2>
            <p>{text.participantNote}</p>
            <p className={view.verificationComplete ? "staff-security-confirmed" : undefined} data-testid="participant-verification-state">{view.verificationComplete ? text.verificationComplete : view.emailVerified ? text.phonePending : view.phoneVerified ? text.emailPending : text.verificationPending}</p>
            {!view.emailVerified ? <section className="staff-security-verification-step" aria-labelledby="participant-email-heading">
              <h3 id="participant-email-heading">{text.emailTitle}</h3>
              <p>{text.emailIntro}</p>
              <form onSubmit={(event) => verify(event, "email")} noValidate aria-labelledby="participant-email-heading" aria-busy={busy}>
                <FormField id="participant-email-code" label={text.emailCodeLabel} hint={text.codeHint} error={emailError} value={emailCode} onChange={(event) => { updateDraft({ emailCode: normalizeDigits(event.target.value), result: null }); setValidation(null); }} dir="ltr" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} maxLength={6} required disabled={busy} />
                <div className="staff-security-actions">
                  <Button type="submit" disabled={busy || !view.emailChallengePending}>{text.emailVerify}</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => void act({ type: "challenge-email" })}>{text.emailChallenge}</Button>
                </div>
              </form>
            </section> : null}
          </section> : null}

          {showSmsForm ? <section className="staff-security-panel" aria-labelledby="sms-verification-heading">
            <h2 id="sms-verification-heading">{staff ? text.challengeTitle : text.phoneTitle}</h2>
            {!staff ? <p id="participant-phone-instructions">{text.phoneIntro}</p> : null}
            <p>{text.challengeIntro}</p>
            <form onSubmit={(event) => verify(event, "sms")} noValidate aria-labelledby="sms-verification-heading" aria-describedby={staff ? undefined : "participant-phone-instructions"} aria-busy={busy}>
              <FormField id="staff-auth-code" label={staff ? text.codeLabel : text.phoneCodeLabel} hint={text.codeHint} error={smsError} value={code} onChange={(event) => { updateDraft({ code: normalizeDigits(event.target.value), result: null }); setValidation(null); }} dir="ltr" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} maxLength={6} required disabled={busy} />
              <div className="staff-security-actions">
                <Button type="submit" disabled={busy || !view.challengePending}>{staff ? text.verify : text.phoneVerify}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void act({ type: "challenge" })}>{text.challenge}</Button>
              </div>
            </form>
          </section> : null}

          {live && (smsMessage || emailMessage) ? <section className="staff-security-panel staff-security-inbox" aria-labelledby="synthetic-inbox-heading" data-testid="synthetic-inbox">
            <h2 id="synthetic-inbox-heading">{text.inboxTitle}</h2>
            <p>{text.inboxNote}</p>
            {smsMessage ? <SyntheticMessage message={smsMessage} locale={locale} /> : null}
            {emailMessage ? <SyntheticMessage message={emailMessage} locale={locale} /> : null}
          </section> : null}

          {live ? <section className="staff-security-panel" aria-label={text.sessionTitle}>
            {staff && view.assurance === "aal2" ? <p className="staff-security-confirmed">{text.confirmed}</p> : !staff && view.verificationComplete ? <p className="staff-security-confirmed">{text.participantChecksPassed}</p> : null}
            <div className="staff-security-actions">
              <Button disabled={busy} onClick={() => void act({ type: "protected" })}>{staff ? text.checkAccess : text.checkParticipant}</Button>
              <Button disabled={busy} variant="secondary" onClick={() => void act({ type: "refresh" })}>{text.refresh}</Button>
              <Button disabled={busy} variant="secondary" onClick={() => void act({ type: "reauthenticate" })}>{text.reauthenticate}</Button>
              <Button disabled={busy} variant="ghost" onClick={() => void act({ type: "logout" })}>{text.logout}</Button>
            </div>
          </section> : null}

          <section className="staff-security-panel" aria-labelledby="staff-recovery-heading">
            <h2 id="staff-recovery-heading">{text.recoveryTitle}</h2>
            <p>{text.recoveryIntro}</p>
            <Button variant="secondary" disabled={busy} onClick={() => void act({ type: "request-reset" })}>{text.recovery}</Button>
            {result?.state === "unavailable" ? <Button variant="ghost" disabled={busy} onClick={() => void act({ type: "status" })}>{text.retry}</Button> : null}
          </section>
        </div>

        <aside className="staff-security-policy" aria-labelledby="staff-policy-heading">
          <h2 id="staff-policy-heading">{text.policyTitle}</h2>
          <ul><li>{text.participantPolicy}</li><li>{text.privilegedPolicy}</li></ul>
          <p>{text.refreshPolicy}</p>
          <p>{text.unsetPolicy}</p>
          <p>{text.emailPolicy}</p>
          {live ? <section className="staff-security-scenarios" aria-labelledby="staff-scenario-heading">
            <h3 id="staff-scenario-heading">{text.scenarioTitle}</h3>
            <p>{text.scenarioNote}</p>
            <div className="staff-security-actions">
              <Button disabled={busy} variant="secondary" onClick={() => void act({ type: "suspend" })}>{text.suspend}</Button>
              <Button disabled={busy} variant="secondary" onClick={() => void act({ type: "simulate-factor-reset" })}>{text.factorReset}</Button>
            </div>
          </section> : null}
        </aside>
      </div>
    </Container>
  );
}
