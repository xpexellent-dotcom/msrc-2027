"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Arrow } from "@/components/ui/arrow";
import { hasParticipantHint, requestAccount } from "@/features/participant-accounts/participant-client";
import { participantCopy } from "@/features/participant-accounts/participant-copy";
import { ProfileAvatar } from "@/features/participant-accounts/profile-avatar";
import { hasPendingParticipantLogout, participantLogoutEvent } from "@/features/participant-accounts/participant-draft";
import { participantProfileAvatarEvent, requestParticipantProfile } from "@/features/participant-accounts/profile-client";
import type { Locale } from "@/lib/i18n";

/**
 * ENG-083/085: the signed-in participant's name, or null. Anonymous visitors
 * never call the account API; the session itself stays in an HttpOnly cookie.
 */
export function useParticipantName(profileDashboard: boolean) {
  const [name, setName] = useState<string | null>(null);
  const [profileEnabled, setProfileEnabled] = useState(false);
  const [avatar, setAvatar] = useState<{ url: string | null; dashboard: boolean } | null>(null);
  useEffect(() => {
    let activeRequest: AbortController | undefined;
    const cancel = () => activeRequest?.abort();
    async function check() {
      cancel();
      if (!hasParticipantHint()) { setName(null); setProfileEnabled(false); setAvatar(null); return; }
      if (hasPendingParticipantLogout()) return;
      const controller = new AbortController();
      activeRequest = controller;
      const { response } = await requestAccount(undefined, controller.signal, "header");
      if (controller.signal.aborted || hasPendingParticipantLogout()) return;
      setName(response.profile?.name ?? null);
      setProfileEnabled(!!response.profile && response.profileEnabled === true);
      if (!response.profile || !response.profileEnabled) { setAvatar(null); return; }
      // My MSRC already reads the authorized profile for its editor.
      if (profileDashboard) return;
      const profile = await requestParticipantProfile(undefined, controller.signal);
      if (!controller.signal.aborted) setAvatar({ url: profile.state === "ready" ? profile.profile.avatarUrl : null, dashboard: false });
    }
    const changed = () => void check();
    const readDashboardAvatar = (event: Event) => {
      if (!profileDashboard || hasPendingParticipantLogout() || !(event instanceof CustomEvent)) return;
      if (event.detail === null || typeof event.detail === "string" && /^\/api\/participant-accounts\/profile\/avatar(?:\?v=\d+)?$/.test(event.detail)) {
        setAvatar({ url: event.detail, dashboard: true });
      }
    };
    window.addEventListener("msrc-participant-hint", changed);
    window.addEventListener(participantProfileAvatarEvent, readDashboardAvatar);
    const logoutChanged = () => {
      if (hasPendingParticipantLogout()) cancel();
      else void check();
    };
    window.addEventListener(participantLogoutEvent, logoutChanged);
    void check();
    return () => {
      cancel();
      window.removeEventListener("msrc-participant-hint", changed);
      window.removeEventListener(participantProfileAvatarEvent, readDashboardAvatar);
      window.removeEventListener(participantLogoutEvent, logoutChanged);
    };
  }, [profileDashboard]);
  return { name, avatarUrl: profileEnabled && avatar?.dashboard === profileDashboard ? avatar.url : null };
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
    {action.name ? null : <Arrow />}
  </ButtonLink>;
}
