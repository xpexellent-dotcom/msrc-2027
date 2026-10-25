"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import type { Locale } from "@/lib/i18n";

/**
 * ENG-083: a "My profile" link for signed-in participants. Anonymous visitors
 * never call the account API; the session itself stays in an HttpOnly cookie.
 */
export function HeaderAccountLink({ locale }: { locale: Locale }) {
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
  if (!name) return null;
  const label = participantCopy[locale].myProfile;
  return <Link className="header-account-link" href={`/${locale}/my-msrc`} aria-label={`${label}: ${name}`} data-testid="header-account-link">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>
    <span>{label}</span>
  </Link>;
}
