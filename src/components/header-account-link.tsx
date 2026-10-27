"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import type { Locale } from "@/lib/i18n";

/**
 * ENG-083/085: the signed-in participant's name, or null. Anonymous visitors
 * never call the account API; the session itself stays in an HttpOnly cookie.
 */
export function useParticipantName() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      if (!hasParticipantHint()) { setName(null); return; }
      const { response } = await requestAccount(undefined, controller.signal);
      if (!controller.signal.aborted) setName(response.profile?.name ?? null);
    }
    void check();
    const changed = () => void check();
    window.addEventListener("msrc-participant-hint", changed);
    return () => { controller.abort(); window.removeEventListener("msrc-participant-hint", changed); };
  }, []);
  return name;
}

/** ENG-085: where the header's primary action goes, for the signed-in state. */
export function headerAction(locale: Locale, name: string | null, signedOutLabel: string) {
  return name ? { href: `/${locale}/my-msrc`, label: participantCopy[locale].myProfile, name } : { href: `/${locale}/sign-in`, label: signedOutLabel, name: null };
}

/** ENG-085: "Reserve your seat" opens Sign in; a signed-in participant sees "My profile" instead. */
export function HeaderPrimaryAction({ action }: { action: ReturnType<typeof headerAction> }) {
  return <ButtonLink className="header-primary-action" href={action.href} variant="gold" size="small" data-signed-in={action.name ? "true" : undefined}
    aria-label={action.name ? `${action.label}: ${action.name}` : undefined} data-testid="header-primary-action">
    {action.name ? <svg className="header-profile-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg> : null}
    {action.label}
    {action.name ? null : <svg className="directional-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg>}
  </ButtonLink>;
}
