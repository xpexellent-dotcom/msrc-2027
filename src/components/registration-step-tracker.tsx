"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { hasParticipantHint, hasSignupPending, requestAccount } from "@/features/participant-accounts/participant-client";
import type { Locale } from "@/lib/i18n";

const trackerCopy = {
  en: { done: "Done", current: "Your next step", waiting: "In progress", upcoming: "Coming up", progress: (step: string, total: string) => `Step ${step} of ${total}`, complete: "All steps complete" },
  ar: { done: "تمّت", current: "خطوتك التالية", waiting: "قيد المعالجة", upcoming: "لاحقًا", progress: (step: string, total: string) => `الخطوة ${step} من ${total}`, complete: "اكتملت جميع الخطوات" },
} as const;

// Steps: create account, verify email, request a seat, receive confirmation and ticket.
const stepLinks = ["/sign-up", "/verify-email", "/my-msrc", "/my-msrc"] as const;
const requested = new Set(["pending_approval", "waitlisted", "offered"]);
const confirmed = new Set(["approved", "confirmed"]);

async function readCurrentStep(signal: AbortSignal): Promise<{ step: number; waiting: boolean }> {
  if (hasParticipantHint()) {
    const { response } = await requestAccount(undefined, signal);
    if (response.profile) {
      try {
        const result = await fetch("/api/registration/me", { credentials: "same-origin", cache: "no-store", signal });
        const body: unknown = result.headers.get("content-type")?.includes("application/json") ? await result.json() : null;
        const status = body && typeof body === "object" && "state" in body && body.state === "ready" && "registration" in body
          && body.registration && typeof body.registration === "object" && "status" in body.registration ? String(body.registration.status) : null;
        if (status && confirmed.has(status)) return { step: 4, waiting: false };
        if (status && requested.has(status)) return { step: 3, waiting: true };
      } catch { /* Registration is optional here; an unreadable status keeps step 3. */ }
      return { step: 2, waiting: false };
    }
  }
  return { step: hasSignupPending() ? 1 : 0, waiting: false };
}

/**
 * ENG-084: the Attend page's Simple steps, highlighting where this visitor is.
 * Anonymous visitors make no account request; the state is a display hint only.
 */
export function RegistrationStepTracker({ locale, steps }: { locale: Locale; steps: readonly string[] }) {
  const copy = trackerCopy[locale];
  const [state, setState] = useState<{ step: number; waiting: boolean }>({ step: 0, waiting: false });
  useEffect(() => {
    const controller = new AbortController();
    const check = () => void readCurrentStep(controller.signal).then((next) => { if (!controller.signal.aborted) setState(next); }).catch(() => undefined);
    check();
    window.addEventListener("msrc-participant-hint", check);
    return () => { controller.abort(); window.removeEventListener("msrc-participant-hint", check); };
  }, []);
  const total = steps.length;
  const digits = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB");
  return <div className="step-tracker" data-testid="registration-step-tracker" data-current-step={state.step + 1}>
    <p className="step-tracker-progress" aria-live="polite">{state.step >= total ? copy.complete : copy.progress(digits.format(state.step + 1), digits.format(total))}</p>
    <div className="step-tracker-bar" aria-hidden="true"><span style={{ inlineSize: `${(Math.min(state.step, total) / total) * 100}%` }} /></div>
    <ol>{steps.map((step, index) => {
      const status = index < state.step ? "done" : index === state.step ? state.waiting ? "waiting" : "current" : "upcoming";
      const label = status === "done" ? copy.done : status === "current" ? copy.current : status === "waiting" ? copy.waiting : copy.upcoming;
      const content = <>
        <span className="step-tracker-marker" aria-hidden="true">{status === "done"
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          : digits.format(index + 1)}</span>
        <span className="step-tracker-copy"><span className="step-tracker-state">{label}</span><span className="step-tracker-title">{step}</span></span>
        {status === "current" ? <svg className="step-tracker-arrow directional-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg> : null}
      </>;
      return <li key={step} data-step-state={status} aria-current={status === "current" || status === "waiting" ? "step" : undefined}>
        {status === "done" ? <div className="step-tracker-item">{content}</div>
          : <Link className="step-tracker-item" href={`/${locale}${stepLinks[index] ?? "/my-msrc"}`} data-testid={index === 0 ? "participation-sign-up" : `registration-step-${index + 1}`}>{content}</Link>}
      </li>;
    })}</ol>
  </div>;
}
