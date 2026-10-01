"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import {
  type HeroVideo,
  type HeroPlaybackPolicy,
  type MediaPreferences,
  defaultHeroPoster,
  hasRenderableVideo,
  isLocalPoster,
  shouldLoadHeroVideo,
  shouldPlayHeroVideo,
} from "@/lib/media-policy";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
type NetworkNavigator = Navigator & { connection?: Connection };

function browserConnection() {
  return (navigator as NetworkNavigator).connection;
}

function subscribePreferences(onChange: () => void) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const size = window.matchMedia("(max-width: 700px)");
  const connection = browserConnection();
  motion.addEventListener("change", onChange);
  size.addEventListener("change", onChange);
  connection?.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    motion.removeEventListener("change", onChange);
    size.removeEventListener("change", onChange);
    connection?.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

// A primitive snapshot stays referentially stable for useSyncExternalStore.
function preferenceSnapshot() {
  const connection = browserConnection();
  return JSON.stringify({
    hydrated: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType,
    visible: document.visibilityState === "visible",
    smallScreen: window.matchMedia("(max-width: 700px)").matches,
  } satisfies MediaPreferences);
}

const serverPreferences = JSON.stringify({
  hydrated: false, reducedMotion: false, saveData: false, visible: false, effectiveType: undefined,
} satisfies MediaPreferences);

const copy = {
  en: {
    pause: "Pause background video", resume: "Play background video",
    still: "Still image mode", unavailable: "Background video unavailable. Showing a still image.",
    videoInstructions: "Press Space or Enter to pause or play the background video.",
  },
  ar: {
    pause: "إيقاف فيديو الخلفية مؤقتًا", resume: "تشغيل فيديو الخلفية",
    still: "وضع الصورة الثابتة", unavailable: "فيديو الخلفية غير متاح. تُعرض صورة ثابتة.",
    videoInstructions: "اضغط مفتاح المسافة أو الإدخال لإيقاف فيديو الخلفية مؤقتًا أو تشغيله.",
  },
} satisfies Record<Locale, {
  pause: string; resume: string; still: string; unavailable: string;
  videoInstructions: string;
}>;

type HeroControlsMode = "button" | "video";

type MediaControlState = {
  locale: Locale; approved: boolean; load: boolean; hydrated: boolean;
  failed: boolean; playing: boolean; controlsMode: HeroControlsMode;
  autoplayBlocked: boolean; togglePlayback: () => void;
};
const MediaControls = createContext<MediaControlState | null>(null);

/** A flow slot lets small-screen controls grow with translated/enlarged text. */
export function HeroMediaControls() {
  const state = useContext(MediaControls);
  if (!state?.approved) return null;
  const text = copy[state.locale];
  if (state.controlsMode === "video") {
    if (state.failed) return <span className="sr-only" role="status">{text.unavailable}</span>;
    if (!state.autoplayBlocked || !state.load) return null;
  }
  return (
    <div className="hero-media-controls">
      {state.load && (
        <button type="button" className="hero-media-control" onClick={state.togglePlayback}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" width="18" height="18" fill="none">
            {state.playing ? <path d="M7 4v12M13 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="m6 4 10 6-10 6V4Z" fill="currentColor" />}
          </svg>
          <span>{state.playing ? text.pause : text.resume}</span>
        </button>
      )}
      {!state.load && state.hydrated && (
        <span className="hero-media-status" role={state.failed ? "status" : undefined}>
          {state.failed ? text.unavailable : text.still}
        </span>
      )}
    </div>
  );
}

/** Original decorative artwork is the default. Real footage requires a recorded approval. */
export function HeroMedia({
  locale,
  video = null,
  posterSrc = defaultHeroPoster,
  allowPreview = false,
  playbackPolicy = "respect-preferences",
  controlsMode = "button",
  children,
}: {
  locale: Locale;
  video?: HeroVideo | null;
  posterSrc?: string;
  allowPreview?: boolean;
  playbackPolicy?: HeroPlaybackPolicy;
  controlsMode?: HeroControlsMode;
  children?: ReactNode;
}) {
  const preferences: MediaPreferences = JSON.parse(
    useSyncExternalStore(subscribePreferences, preferenceSnapshot, () => serverPreferences),
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const backgroundToggleRef = useRef<HTMLButtonElement>(null);
  const videoInstructionsId = useId();
  const [userPaused, setUserPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frameAvailable, setFrameAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const approved = hasRenderableVideo(video, allowPreview);
  const load = approved && shouldLoadHeroVideo(preferences, playbackPolicy) && !failed;
  const play = load && shouldPlayHeroVideo(preferences, userPaused, playbackPolicy) && !autoplayBlocked;
  const poster = approved ? video.poster : isLocalPoster(posterSrc) ? posterSrc : defaultHeroPoster;
  const source = approved ? (preferences.smallScreen && video.mobileSrc ? video.mobileSrc : video.src) : undefined;
  const videoControls = controlsMode === "video";
  const text = copy[locale];

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !play) return;
    let cancelled = false;
    void element.play().then(() => {
      if (!cancelled) setPlaying(true);
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setAutoplayBlocked(true);
        setPlaying(false);
      } else if (!(error instanceof DOMException && error.name === "AbortError")) {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      element.pause();
    };
  }, [play, source]);

  function togglePlayback() {
    if (playing) {
      setUserPaused(true);
      setPlaying(false);
      videoRef.current?.pause();
    } else {
      setUserPaused(false);
      // Browser-rejected autoplay is recoverable through this actual gesture.
      // Call play here, before an effect can lose the activation context.
      const element = videoRef.current;
      if (element) void element.play().then(() => {
        setPlaying(true);
        setAutoplayBlocked(false);
        // The recovery button disappears after successful play. Keep keyboard
        // focus on its background toggle so a visitor can pause it again.
        if (videoControls && autoplayBlocked) backgroundToggleRef.current?.focus({ preventScroll: true });
      }).catch((error: unknown) => {
        setPlaying(false);
        if (error instanceof DOMException && error.name === "NotAllowedError") setAutoplayBlocked(true);
        else if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    }
  }

  return (
    <MediaControls.Provider value={{ locale, approved, load, hydrated: preferences.hydrated, failed, playing, controlsMode, autoplayBlocked, togglePlayback }}>
    <div className="hero-media" data-playback-policy={playbackPolicy} data-controls-mode={controlsMode} data-media-state={playing && load ? "playing" : frameAvailable && load ? "paused" : "poster"}>
      <picture>
        {approved && video.mobilePoster && <source media="(max-width: 700px)" srcSet={video.mobilePoster} />}
        <Image
          src={poster} alt="" fill sizes="100vw" unoptimized
          loading="eager" fetchPriority="high" className="hero-media-poster" aria-hidden="true"
        />
      </picture>
      {load && (
        <video
          ref={videoRef} src={source} poster={preferences.smallScreen && video.mobilePoster ? video.mobilePoster : poster}
          className={`hero-media-video${frameAvailable ? " is-playing" : ""}`}
          muted autoPlay={!userPaused && !autoplayBlocked && preferences.visible} playsInline loop preload="metadata"
          aria-hidden="true" tabIndex={-1}
          disablePictureInPicture disableRemotePlayback
          onLoadStart={() => setFrameAvailable(false)}
          onLoadedData={() => setFrameAvailable(true)}
          onPlaying={() => { setFrameAvailable(true); setPlaying(true); }}
          onPause={() => setPlaying(false)}
          onError={() => { setPlaying(false); setFailed(true); }}
        />
      )}
      <div className="hero-media-scrim" aria-hidden="true" />
      {videoControls && load && <>
        <button
          ref={backgroundToggleRef} type="button" className="hero-media-toggle"
          aria-label={playing ? text.pause : text.resume} aria-describedby={videoInstructionsId}
          aria-keyshortcuts="Space Enter" onClick={togglePlayback}
        />
        <span id={videoInstructionsId} className="sr-only">{text.videoInstructions}</span>
      </>}
    </div>
    {children ?? <HeroMediaControls />}
    </MediaControls.Provider>
  );
}
