"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FormField } from "@/components/forms/form-field";
import { staffSecurityCopy, type StaffSecurityMessage } from "@/features/auth/staff-security-copy";
import type { PreviewAction, PreviewResult, PreviewView } from "@/features/auth/mfa-contract";
import type { Locale } from "@/lib/i18n";

type Draft = Readonly<{
  code: string;
  view: PreviewView | null;
  enrollment: PreviewView["enrollment"] | null;
  result: PreviewResult | null;
}>;
const emptyDraft: Draft = { code: "", view: null, enrollment: null, result: null };
let draft: Draft = emptyDraft;
const listeners = new Set<() => void>();

// LOC-01: retain transient entries across in-app locale changes. No code, factor key,
// bearer credential or assurance is written to localStorage, sessionStorage or a URL.
function updateDraft(next: Partial<Draft>) {
  draft = { ...draft, ...next };
  for (const listener of listeners) listener();
}
function subscribeDraft(listener: () => void) {
  listeners.add(listener);
  const clearOnUnload = () => { draft = emptyDraft; };
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
    if (!response.headers.get("content-type")?.includes("application/json")) {
      return { state: "unavailable", code: "unavailable" };
    }
    const result = await response.json() as PreviewResult;
    if (!["ok", "denied", "unavailable"].includes(result.state) || typeof result.code !== "string") {
      return { state: "unavailable", code: "unavailable" };
    }
    // UI state is presentation only. The next request rechecks server authority.
    return result;
  } catch {
    return { state: "unavailable", code: "unavailable" };
  }
}

function acceptResult(result: PreviewResult, action: PreviewAction["type"]) {
  const cleared = ["start", "logout", "suspend", "simulate-factor-reset"].includes(action) && result.state === "ok";
  const noSession = result.code === "no_session" || result.code === "logged_out";
  const removeSetup = cleared || noSession || result.code === "verified" || result.code === "reauthenticated" || (result.view && result.view.status !== "active");
  updateDraft({
    result,
    view: noSession ? null : result.view ?? draft.view,
    enrollment: removeSetup ? null : result.view?.enrollment ?? draft.enrollment,
    code: removeSetup ? "" : draft.code,
  });
}

export function StaffSecurityPreview({ locale }: { locale: Locale }) {
  const text = staffSecurityCopy[locale];
  const snapshot = useSyncExternalStore(subscribeDraft, readDraft, readServerDraft);
  const { view, enrollment, result, code } = snapshot;
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ target: "error" | "setup" | "code" | "session"; sequence: number } | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const setupHeading = useRef<HTMLHeadingElement>(null);
  const sessionHeading = useRef<HTMLHeadingElement>(null);
  const actionLock = useRef(false);
  const actionGeneration = useRef(0);
  const live = view?.status === "active";
  const staff = view?.kind === "staff";
  const showCode = live && staff && (view.factor === "pending" || view.challengeRequired);
  const fieldError = validation ? text.codeValidation : result?.code === "invalid_code" ? text.messages.invalid_code : undefined;
  const messageKey: StaffSecurityMessage = result && result.code in text.messages ? result.code as StaffSecurityMessage : "unavailable";
  const message = validation ? text.codeValidation : result && result.code !== "status" ? text.messages[messageKey] : "";
  const failed = validation || (Boolean(message) && result?.state !== "ok");

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      const generation = actionGeneration.current;
      const response = await requestPreview({ type: "status" }, controller.signal);
      if (!controller.signal.aborted && !actionLock.current && generation === actionGeneration.current) acceptResult(response, "status");
    }
    void checkSession();
    // Checks do not count as user activity or issue a token refresh.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkSession();
    }, 60_000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === "error") summary.current?.focus();
    if (focusRequest.target === "setup") setupHeading.current?.focus();
    if (focusRequest.target === "session") sessionHeading.current?.focus();
    if (focusRequest.target === "code") document.getElementById("staff-auth-code")?.focus();
  }, [focusRequest]);

  async function act(action: PreviewAction) {
    if (actionLock.current) return;
    actionLock.current = true;
    actionGeneration.current += 1;
    setBusy(true);
    setValidation(false);
    const response = await requestPreview(action);
    acceptResult(response, action.type);
    setBusy(false);
    actionLock.current = false;
    const target = response.state !== "ok" ? "error" : action.type === "enroll" ? "setup" : action.type === "challenge" ? "code" : "session";
    setFocusRequest((previous) => ({ target, sequence: (previous?.sequence ?? 0) + 1 }));
  }

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setValidation(true);
      setFocusRequest((previous) => ({ target: "error", sequence: (previous?.sequence ?? 0) + 1 }));
      return;
    }
    void act({ type: "verify", code });
  }

  function formatExpiry(timestamp: number) {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory",
    }).format(new Date(timestamp));
  }

  return (
    <Container className="staff-security-preview" data-testid="staff-security-preview">
      <header className="staff-security-intro">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
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
                <div><dt>{text.assuranceLabel}</dt><dd data-testid="session-assurance">{view.assurance === "aal2" ? text.assured : text.missing}</dd></div>
                <div><dt>{text.absolute}</dt><dd><time dateTime={new Date(view.absoluteExpiresAt).toISOString()} data-testid="absolute-expiry">{formatExpiry(view.absoluteExpiresAt)}</time></dd></div>
                {view.idleExpiresAt !== null ? <div><dt>{text.idle}</dt><dd><time dateTime={new Date(view.idleExpiresAt).toISOString()}>{formatExpiry(view.idleExpiresAt)}</time></dd></div> : null}
              </dl>
              <p className="staff-security-closed" data-testid="live-access-closed">{text.accessClosed}</p>
            </> : null}
            {!live ? <div className="staff-security-actions">
              <Button disabled={busy} onClick={() => void act({ type: "start", kind: "staff" })}>{view ? text.restart : text.start}</Button>
              <Button disabled={busy} variant="secondary" onClick={() => void act({ type: "start", kind: "participant" })}>{text.participant}</Button>
            </div> : null}
          </section>

          {live && staff && view.factor !== "verified" ? <section className="staff-security-panel" aria-labelledby="staff-setup-heading">
            <h2 id="staff-setup-heading" ref={setupHeading} tabIndex={-1}>{text.setupTitle}</h2>
            <p>{view.factor === "pending" && !enrollment ? text.setupUnavailable : text.setupIntro}</p>
            {!enrollment ? view.factor === "pending" ? <Button disabled={busy} onClick={() => void act({ type: "start", kind: "staff" })}>{text.restart}</Button> : <Button disabled={busy} onClick={() => void act({ type: "enroll" })}>{text.enroll}</Button> : <>
              <div className="staff-security-setup-methods">
                <section aria-labelledby="staff-qr-heading">
                  <h3 id="staff-qr-heading">{text.qrTitle}</h3>
                  <Image className="staff-security-qr" data-testid="setup-qr" src={enrollment.qrDataUrl} alt={text.qrAlt} width={240} height={240} unoptimized />
                  <p>{text.qrNote}</p>
                </section>
                <section aria-labelledby="staff-manual-heading">
                  <h3 id="staff-manual-heading">{text.manualTitle}</h3>
                  <p>{text.manualNote}</p>
                  <FormField id="staff-setup-key" label={text.keyLabel} value={enrollment.secret} readOnly dir="ltr" spellCheck={false} autoComplete="off" className="staff-security-key" data-testid="setup-key" />
                </section>
              </div>
              <p className="field-hint">{text.secretNote}</p>
            </>}
          </section> : null}

          {showCode ? <section className="staff-security-panel" aria-labelledby="staff-challenge-heading">
            <h2 id="staff-challenge-heading">{text.challengeTitle}</h2>
            <p>{text.challengeIntro}</p>
            <form onSubmit={verify} noValidate aria-labelledby="staff-challenge-heading" aria-busy={busy}>
              <FormField id="staff-auth-code" label={text.codeLabel} hint={text.codeHint} error={fieldError} value={code} onChange={(event) => { updateDraft({ code: normalizeDigits(event.target.value), result: null }); setValidation(false); }} dir="ltr" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} maxLength={6} required disabled={busy} />
              <div className="staff-security-actions">
                <Button type="submit" disabled={busy || !view.challengePending}>{text.verify}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void act({ type: "challenge" })}>{text.challenge}</Button>
              </div>
            </form>
          </section> : null}

          {live ? <section className="staff-security-panel" aria-label={text.sessionTitle}>
            {staff && view.assurance === "aal2" ? <p className="staff-security-confirmed">{text.confirmed}</p> : !staff ? <p>{text.participantNote}</p> : null}
            <div className="staff-security-actions">
              <Button disabled={busy} onClick={() => void act({ type: "protected" })}>{text.checkAccess}</Button>
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
