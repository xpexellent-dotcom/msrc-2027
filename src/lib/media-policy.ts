// DSN-01 / MED-01/04: enhancement is optional; the poster is always available.
export type ApprovedHeroVideo = {
  src: string;
  poster: string;
  approval: "approved";
};

export type MediaPreferences = {
  hydrated: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType: string | undefined;
  visible: boolean;
};

export const defaultHeroPoster = "/brand/hero-poster.svg";

function isLocalAsset(value: string): boolean {
  return /^\/(?!\/)[a-zA-Z0-9/_\-.]+$/.test(value) && !value.includes("..");
}

export function isLocalPoster(value: string): boolean {
  return isLocalAsset(value) && /\.(svg|webp|png|jpe?g)$/i.test(value);
}

export function hasApprovedVideo(video: ApprovedHeroVideo | null | undefined): video is ApprovedHeroVideo {
  return Boolean(
    video?.approval === "approved" &&
    isLocalAsset(video.src) && /\.(mp4|webm)$/i.test(video.src) &&
    isLocalPoster(video.poster),
  );
}

export function shouldLoadHeroVideo(preferences: MediaPreferences): boolean {
  return preferences.hydrated && preferences.visible &&
    !preferences.reducedMotion && !preferences.saveData &&
    !["slow-2g", "2g", "3g"].includes(preferences.effectiveType ?? "");
}

export function shouldPlayHeroVideo(preferences: MediaPreferences, userPaused: boolean): boolean {
  return shouldLoadHeroVideo(preferences) && !userPaused;
}
