import { describe, expect, it } from "vitest";
import {
  type ApprovedHeroVideo, type MediaPreferences, type PreviewHeroVideo,
  hasApprovedVideo, hasRenderableVideo, isLocalPoster, shouldLoadHeroVideo, shouldPlayHeroVideo,
} from "@/lib/media-policy";

const preferences: MediaPreferences = {
  hydrated: true, visible: true, reducedMotion: false, saveData: false, effectiveType: "4g",
};
const fixture: ApprovedHeroVideo = {
  src: "/media/synthetic-test.webm", poster: "/brand/hero-poster.svg", approval: "approved",
};

describe("hero enhancement preferences (DSN-01, ACC-01)", () => {
  it("never loads before client preferences are known", () => {
    expect(shouldLoadHeroVideo({ ...preferences, hydrated: false })).toBe(false);
  });
  it.each([
    { reducedMotion: true }, { saveData: true }, { visible: false },
    { effectiveType: "slow-2g" }, { effectiveType: "2g" }, { effectiveType: "3g" },
  ])("keeps still mode without downloading video for %j", (constraint) => {
    expect(shouldLoadHeroVideo({ ...preferences, ...constraint })).toBe(false);
  });
  it("permits enhancement when a browser has no Network Information API", () => {
    expect(shouldLoadHeroVideo({ ...preferences, effectiveType: undefined })).toBe(true);
  });
  it("does not erase a user pause after visibility or preference changes", () => {
    for (const state of [preferences, { ...preferences, visible: false }, preferences]) {
      expect(shouldPlayHeroVideo(state, true)).toBe(false);
    }
    expect(shouldPlayHeroVideo(preferences, false)).toBe(true);
  });
});

describe("organizer-selected public autoplay policy", () => {
  it("waits for hydration even when autoplay is selected", () => {
    const server = { ...preferences, hydrated: false };
    expect(shouldLoadHeroVideo(server, "autoplay")).toBe(false);
    expect(shouldPlayHeroVideo(server, false, "autoplay")).toBe(false);
  });
  it.each([
    { reducedMotion: true }, { saveData: true },
    { effectiveType: "slow-2g" }, { effectiveType: "2g" }, { effectiveType: "3g" },
    { reducedMotion: true, saveData: true, effectiveType: "2g" },
  ])("loads and plays the approved public film for %j", (constraint) => {
    const state = { ...preferences, ...constraint };
    expect(shouldLoadHeroVideo(state, "autoplay")).toBe(true);
    expect(shouldPlayHeroVideo(state, false, "autoplay")).toBe(true);
    expect(shouldPlayHeroVideo(state, true, "autoplay")).toBe(false);
  });
  it("keeps a hidden video's source mounted but pauses playback", () => {
    const hidden = { ...preferences, visible: false };
    expect(shouldLoadHeroVideo(hidden, "autoplay")).toBe(true);
    expect(shouldPlayHeroVideo(hidden, false, "autoplay")).toBe(false);
    expect(shouldPlayHeroVideo(preferences, false, "autoplay")).toBe(true);
  });
  it("never overrides a manual pause when visibility or preferences change", () => {
    for (const state of [
      preferences,
      { ...preferences, visible: false },
      { ...preferences, reducedMotion: true, saveData: true, effectiveType: "3g" },
      preferences,
    ]) {
      expect(shouldPlayHeroVideo(state, true, "autoplay")).toBe(false);
    }
  });
});

describe("approved local media boundary (MED-01/04)", () => {
  it("defaults to no video, and permits an explicitly approved local derivative", () => {
    expect(hasApprovedVideo(null)).toBe(false);
    expect(hasApprovedVideo(undefined)).toBe(false);
    expect(hasApprovedVideo(fixture)).toBe(true);
    expect(hasApprovedVideo({ ...fixture, approval: "draft" as "approved" })).toBe(false);
  });
  it.each([
    "https://video.example.test/movie.mp4", "//video.example.test/movie.mp4",
    "/\\video.example.test/movie.mp4", "/%2fvideo.example.test/movie.mp4",
    "/media/../secret.mp4", "/media/movie.mp4?token=secret", "/media/movie.mov",
    "data:video/mp4;base64,abc", "javascript:alert(1)",
  ])("rejects remote, unsupported or decorated asset %s", (src) => {
    expect(hasApprovedVideo({ ...fixture, src })).toBe(false);
  });
  it("requires a valid local poster alongside a video", () => {
    expect(hasApprovedVideo({ ...fixture, poster: "https://example.test/poster.jpg" })).toBe(false);
    expect(isLocalPoster("/brand/hero-poster.svg")).toBe(true);
    expect(isLocalPoster("/brand/readme.txt")).toBe(false);
  });
  it("rejects untrusted mobile sources alongside an otherwise valid desktop asset", () => {
    expect(hasApprovedVideo({ ...fixture, mobileSrc: "https://example.test/mobile.mp4" })).toBe(false);
    expect(hasApprovedVideo({ ...fixture, mobilePoster: "/media/../poster.jpg" })).toBe(false);
  });
  it("keeps the exact local review cut separate from approved public media", () => {
    const preview: PreviewHeroVideo = {
      approval: "preview", src: "/api/preview-media/desktop.mp4", poster: "/api/preview-media/poster-desktop.jpg",
      mobileSrc: "/api/preview-media/mobile.mp4", mobilePoster: "/api/preview-media/poster-mobile.jpg",
    };
    expect(hasRenderableVideo(preview)).toBe(false);
    expect(hasRenderableVideo(preview, true)).toBe(true);
    expect(hasRenderableVideo({ ...preview, src: "/media/original.mp4" }, true)).toBe(false);
    expect(hasRenderableVideo({ ...preview, mobilePoster: "https://example.test/poster.jpg" }, true)).toBe(false);
    expect(hasRenderableVideo(fixture)).toBe(true);
  });
});
