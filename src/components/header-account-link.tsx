"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import { ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { requestParticipantProfile } from "@/features/participant-accounts/profile-client";
import type { Locale } from "@/lib/i18n";

/**
 * ENG-083: a "My profile" link for signed-in participants. Anonymous visitors
 * never call the account API; the session itself stays in an HttpOnly cookie.
 */
export function HeaderAccountLink({ locale }: { locale: Locale }) {
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
  if (!name) return null;
  const label = participantCopy[locale].myProfile;
  return <Link className="header-account-link" href={`/${locale}/my-msrc`} aria-label={`${label}: ${name}`} data-testid="header-account-link">
    <ProfileAvatar name={name} url={avatarUrl} className="header-profile-avatar" />
    <span className="header-account-label">{label}</span>
  </Link>;
}
