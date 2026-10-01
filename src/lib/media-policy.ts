// DSN-01 / MED-01/04: enhancement is optional; the poster is always available.
type HeroVideoSources = {
  src: string;
  poster: string;
  mobileSrc?: string;
  mobilePoster?: string;
};
export type ApprovedHeroVideo = HeroVideoSources & {
  approval: "approved";
};
export type PreviewHeroVideo = HeroVideoSources & { approval: "preview" };
export type HeroVideo = ApprovedHeroVideo | PreviewHeroVideo;
export type HeroPlaybackPolicy = "respect-preferences" | "autoplay";

export type MediaPreferences = {
  hydrated: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType: string | undefined;
  visible: boolean;
  smallScreen?: boolean;
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
    isLocalPoster(video.poster) &&
    (!video.mobileSrc || (isLocalAsset(video.mobileSrc) && /\.(mp4|webm)$/i.test(video.mobileSrc))) &&
    (!video.mobilePoster || isLocalPoster(video.mobilePoster)),
  );
}

/** A review cut never qualifies as published media. Its server routes are dev-only. */
export function hasRenderableVideo(video: HeroVideo | null | undefined, allowPreview = false): video is HeroVideo {
  if (video?.approval === "approved") return hasApprovedVideo(video);
  return Boolean(allowPreview && video?.approval === "preview" &&
    video.src === "/api/preview-media/desktop.mp4" &&
    video.poster === "/api/preview-media/poster-desktop.jpg" &&
    video.mobileSrc === "/api/preview-media/mobile.mp4" &&
    video.mobilePoster === "/api/preview-media/poster-mobile.jpg");
}

export function shouldLoadHeroVideo(preferences: MediaPreferences, policy: HeroPlaybackPolicy = "respect-preferences"): boolean {
  // ORG-003: the public homepage explicitly attempts muted autoplay. Keeping
  // the element mounted preserves the selected source/frame across hidden tabs.
  if (policy === "autoplay") return preferences.hydrated;
  return preferences.hydrated && preferences.visible &&
    !preferences.reducedMotion && !preferences.saveData &&
    !["slow-2g", "2g", "3g"].includes(preferences.effectiveType ?? "");
}

export function shouldPlayHeroVideo(preferences: MediaPreferences, userPaused: boolean, policy: HeroPlaybackPolicy = "respect-preferences"): boolean {
  return shouldLoadHeroVideo(preferences, policy) && preferences.visible && !userPaused;
}
