"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { abstractDates } from "@/content/abstract-dates";
import { formatRegistrationOpeningDate } from "@/content/registration-opening";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import type { AbstractResponse } from "@/features/submissions/contracts";
import type { Locale } from "@/lib/i18n";
import { researchCompetitionCopy } from "./copy";
import { researchCtaState, type ResearchCtaState } from "./cta-state";

export function AbstractSubmissionCta({ locale, reviewMode = false }: { locale: Locale; reviewMode?: boolean }) {
  // Keep the public server render independent of cookies and private data.
  const [observedState, setState] = useState<ResearchCtaState>("signIn");
  const state = reviewMode ? "submit" : observedState;
  const [checked, setChecked] = useState<boolean[]>([]);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const headingId = useId(), introId = useId();
  useEffect(() => {
    // This prop is granted only by the server's preview/development guard.
    if (reviewMode) return;
    const controller = new AbortController(); let generation = 0;
    async function check() {
      const current = ++generation, now = new Date();
      const initial = researchCtaState({ signedIn: false, now });
      setState(initial);
      if (initial === "opening" || !hasParticipantHint()) return;
      const { response: account } = await requestAccount(undefined, controller.signal);
      if (controller.signal.aborted || current !== generation || !account.profile) return;
      try {
        const response = await fetch(`/api/abstracts?locale=${locale}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() as AbstractResponse : undefined;
        if (!controller.signal.aborted && current === generation) setState(researchCtaState({ signedIn: true, response: data, now }));
      } catch { if (!controller.signal.aborted && current === generation) setState("submit"); }
    }
    void check();
    const changed = () => void check();
    window.addEventListener("msrc-participant-hint", changed); window.addEventListener("msrc-participant-profile", changed); window.addEventListener("focus", changed);
    return () => { controller.abort(); window.removeEventListener("msrc-participant-hint", changed); window.removeEventListener("msrc-participant-profile", changed); window.removeEventListener("focus", changed); };
  }, [locale, reviewMode]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  const copy = researchCompetitionCopy[locale];
  const formHref = `/${locale}/abstracts/submit${reviewMode ? "?review=1" : ""}`;
  const href = state === "profile" ? `/${locale}/my-msrc#profile` : state === "signIn" ? `/${locale}/sign-in` : formHref;
  const acknowledged = copy.checklist.every((_, index) => checked[index] === true);
  function acknowledge(event: MouseEvent<HTMLAnchorElement>) {
    if ((state !== "submit" && state !== "draft") || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !dialog.current?.showModal) return;
    event.preventDefault();
    // Safari pointer activation does not focus links automatically. Explicitly
    // retain the initiating link before entering the native modal focus scope.
    trigger.current = event.currentTarget;
    trigger.current.focus({ preventScroll: true });
    setChecked([]);
    dialog.current.showModal();
    setOpen(true);
  }
  function close() { dialog.current?.close(); }
  function wrapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    // Native dialogs keep the page inert, but Chromium can send boundary Tab
    // presses to browser chrome. Keep both directions inside the modal instead.
    const controls = event.currentTarget.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input:not(:disabled), button:not(:disabled)");
    const first = controls[0], last = controls[controls.length - 1];
    if (first && last && document.activeElement === (event.shiftKey ? first : last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
  function continueToForm() {
    if (!acknowledged) return;
    // Crossing into the private workspace requires a new document and its CSP.
    window.location.assign(new URL(formHref, window.location.origin).href);
  }
  return <>
    <ButtonLink href={href} variant="gold" disabled={state === "opening"} className="research-submission-cta" data-testid="research-submission-cta" onClick={acknowledge} aria-haspopup={state === "submit" || state === "draft" ? "dialog" : undefined}>
      {state === "opening" ? <>{copy.cta.opening} <time dateTime={abstractDates[0].date}>{formatRegistrationOpeningDate(`${abstractDates[0].date}T00:00:00+03:00`, locale, false)}</time></> : copy.cta[state]}
    </ButtonLink>
    <dialog ref={dialog} className="research-acknowledgement" aria-labelledby={headingId} aria-describedby={introId} dir={locale === "ar" ? "rtl" : "ltr"} onKeyDown={wrapDialogFocus} onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}>
      <div className="research-acknowledgement__header">
        {locale === "ar" ? <p className="research-acknowledgement__draft">{copy.draftTranslation}</p> : null}
        <h2 id={headingId}>{copy.prepare}</h2>
        <p id={introId} className="research-acknowledgement__intro">{copy.acknowledgeIntro}</p>
      </div>
      <div className="research-acknowledgement__checklist">{copy.checklist.map((item, index) => <label key={item}>
        <input type="checkbox" checked={checked[index] ?? false} onChange={(event) => setChecked((current) => { const next = [...current]; next[index] = event.target.checked; return next; })} />
        <span>{item}</span>
      </label>)}</div>
      <div className="research-acknowledgement__actions">
        <Button variant="secondary" onClick={close}>{copy.cancel}</Button>
        <Button variant="primary" disabled={!acknowledged} onClick={continueToForm}>{copy.continueToForm}</Button>
      </div>
    </dialog>
  </>;
}
