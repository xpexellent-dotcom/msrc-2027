"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import {
  type HeroVideo,
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
  },
  ar: {
    pause: "إيقاف فيديو الخلفية مؤقتًا", resume: "تشغيل فيديو الخلفية",
    still: "وضع الصورة الثابتة", unavailable: "فيديو الخلفية غير متاح. تُعرض صورة ثابتة.",
  },
} satisfies Record<Locale, { pause: string; resume: string; still: string; unavailable: string }>;

type MediaControlState = {
  locale: Locale; approved: boolean; load: boolean; hydrated: boolean;
  failed: boolean; playing: boolean; togglePlayback: () => void;
};
const MediaControls = createContext<MediaControlState | null>(null);

/** A flow slot lets small-screen controls grow with translated/enlarged text. */
export function HeroMediaControls() {
  const state = useContext(MediaControls);
  if (!state?.approved) return null;
  const text = copy[state.locale];
  return (
    <div className="hero-media-controls">
      {state.load && (
        <button type="button" className="hero-media-control" onClick={state.togglePlayback}>
          <span aria-hidden="true">{state.playing ? "Ⅱ" : "▷"}</span>
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
  children,
}: {
  locale: Locale;
  video?: HeroVideo | null;
  posterSrc?: string;
  allowPreview?: boolean;
  children?: ReactNode;
}) {
  const preferences: MediaPreferences = JSON.parse(
    useSyncExternalStore(subscribePreferences, preferenceSnapshot, () => serverPreferences),
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frameAvailable, setFrameAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const approved = hasRenderableVideo(video, allowPreview);
  const load = approved && shouldLoadHeroVideo(preferences) && !failed;
  const play = load && shouldPlayHeroVideo(preferences, userPaused);
  const poster = approved ? video.poster : isLocalPoster(posterSrc) ? posterSrc : defaultHeroPoster;
  const source = approved ? (preferences.smallScreen && video.mobileSrc ? video.mobileSrc : video.src) : undefined;

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !play) return;
    let cancelled = false;
    void element.play().then(() => {
      if (!cancelled) setPlaying(true);
    }).catch(() => {
      if (!cancelled) setFailed(true);
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
    }
  }

  return (
    <MediaControls.Provider value={{ locale, approved, load, hydrated: preferences.hydrated, failed, playing, togglePlayback }}>
    <div className="hero-media" data-media-state={playing && load ? "playing" : frameAvailable && load ? "paused" : "poster"}>
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
          muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1}
          disablePictureInPicture disableRemotePlayback
          onLoadStart={() => setFrameAvailable(false)}
          onLoadedData={() => setFrameAvailable(true)}
          onPlaying={() => { setFrameAvailable(true); setPlaying(true); }}
          onPause={() => setPlaying(false)}
          onError={() => { setPlaying(false); setFailed(true); }}
        />
      )}
      <div className="hero-media-scrim" aria-hidden="true" />
    </div>
    {children ?? <HeroMediaControls />}
    </MediaControls.Provider>
  );
}
