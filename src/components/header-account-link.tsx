"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import { ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { requestParticipantProfile } from "@/features/participant-accounts/profile-client";
import type { Locale } from "@/lib/i18n";

/**
 * ENG-083/085: the signed-in participant's name, or null. Anonymous visitors
 * never call the account API; the session itself stays in an HttpOnly cookie.
 */
export function useParticipantName() {
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let generation = 0;
    async function check() {
      const current = ++generation;
      if (!hasParticipantHint()) { setName(null); setAvatarUrl(null); return; }
      const { response } = await requestAccount(undefined, controller.signal);
      if (controller.signal.aborted || current !== generation) return;
      setName(response.profile?.name ?? null); setAvatarUrl(null);
      if (response.profile && response.profileEnabled) {
        const profile = await requestParticipantProfile(undefined, controller.signal);
        if (!controller.signal.aborted && current === generation) setAvatarUrl(profile.state === "ready" ? profile.profile.avatarUrl : null);
      }
    }
    void check();
    const changed = () => void check();
    window.addEventListener("msrc-participant-hint", changed);
    window.addEventListener("msrc-participant-profile", changed);
    return () => { controller.abort(); window.removeEventListener("msrc-participant-hint", changed); window.removeEventListener("msrc-participant-profile", changed); };
  }, []);
  return { name, avatarUrl };
}

/** ENG-085: where the header's primary action goes, for the signed-in state. */
export function headerAction(locale: Locale, account: { name: string | null; avatarUrl: string | null }, signedOutLabel: string) {
  const { name, avatarUrl } = account;
  return name ? { href: `/${locale}/my-msrc`, label: participantCopy[locale].myProfile, name, avatarUrl } : { href: `/${locale}/sign-in`, label: signedOutLabel, name: null, avatarUrl: null };
}

/** ENG-085/086: "Reserve your seat" opens Sign in; a signed-in participant sees "My profile" with their picture or initials. */
export function HeaderPrimaryAction({ action }: { action: ReturnType<typeof headerAction> }) {
  return <ButtonLink className="header-primary-action" href={action.href} variant="gold" size="small" data-signed-in={action.name ? "true" : undefined}
    aria-label={action.name ? `${action.label}: ${action.name}` : undefined} data-testid="header-primary-action">
    {action.name ? <ProfileAvatar name={action.name} url={action.avatarUrl} className="header-profile-avatar" /> : null}
    {action.label}
    {action.name ? null : <svg className="directional-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg>}
  </ButtonLink>;
}
