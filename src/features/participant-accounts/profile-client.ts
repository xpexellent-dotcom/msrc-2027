"use client";

import { decodeProfileResponse, type ParticipantProfileResponse } from "./profile-contract";

export const participantProfileAvatarEvent = "msrc-participant-profile-avatar";

export function publishParticipantProfileAvatar(avatarUrl: string | null) {
  window.dispatchEvent(new CustomEvent(participantProfileAvatarEvent, { detail: avatarUrl }));
}

export async function requestParticipantProfile(payload?: FormData, signal?: AbortSignal): Promise<ParticipantProfileResponse> {
  try {
    const response = await fetch("/api/participant-accounts/profile", {
      method: payload ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
      ...(payload ? { body: payload } : {}),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) return { state: "unavailable" };
    return decodeProfileResponse(await response.json());
  } catch { return { state: "unavailable" }; }
}
