import { describe, expect, it } from "vitest";
import {
  type ApprovedHeroVideo, type MediaPreferences,
  hasApprovedVideo, isLocalPoster, shouldLoadHeroVideo, shouldPlayHeroVideo,
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
});
