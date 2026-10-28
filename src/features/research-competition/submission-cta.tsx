"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { abstractDates } from "@/content/abstract-dates";
import { formatRegistrationOpeningDate } from "@/content/registration-opening";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import type { AbstractResponse } from "@/features/submissions/contracts";
import type { Locale } from "@/lib/i18n";
import { researchCompetitionCopy } from "./copy";
import { researchCtaState, type ResearchCtaState } from "./cta-state";

export function AbstractSubmissionCta({ locale }: { locale: Locale }) {
  // Keep the public server render independent of cookies and private data.
  const [state, setState] = useState<ResearchCtaState>("signIn");
  useEffect(() => {
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
  }, [locale]);
  const copy = researchCompetitionCopy[locale].cta;
  const href = state === "profile" ? `/${locale}/my-msrc#profile` : state === "signIn" ? `/${locale}/sign-in` : `/${locale}/abstracts/submit`;
  return <ButtonLink href={href} variant="gold" disabled={state === "opening"} className="research-submission-cta" data-testid="research-submission-cta">
    {state === "opening" ? <>{copy.opening} <time dateTime={abstractDates[0].date}>{formatRegistrationOpeningDate(`${abstractDates[0].date}T00:00:00+03:00`, locale, false)}</time></> : copy[state]}
  </ButtonLink>;
}
