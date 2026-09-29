"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n";
import {
  type ApprovedHeroVideo,
  type MediaPreferences,
  defaultHeroPoster,
  hasApprovedVideo,
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
  const connection = browserConnection();
  motion.addEventListener("change", onChange);
  connection?.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    motion.removeEventListener("change", onChange);
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

/** Original decorative artwork is the default. Real footage requires a recorded approval. */
export function HeroMedia({
  locale,
  video = null,
  posterSrc = defaultHeroPoster,
}: {
  locale: Locale;
  video?: ApprovedHeroVideo | null;
  posterSrc?: string;
}) {
  const preferences: MediaPreferences = JSON.parse(
    useSyncExternalStore(subscribePreferences, preferenceSnapshot, () => serverPreferences),
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const approved = hasApprovedVideo(video);
  const load = approved && shouldLoadHeroVideo(preferences) && !failed;
  const play = load && shouldPlayHeroVideo(preferences, userPaused);
  const poster = approved ? video.poster : isLocalPoster(posterSrc) ? posterSrc : defaultHeroPoster;
  const text = copy[locale];

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
  }, [play, video?.src]);

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
    <div className="hero-media" data-media-state={playing && load ? "playing" : "poster"}>
      <Image
        src={poster} alt="" fill sizes="100vw" unoptimized
        loading="eager" fetchPriority="high" className="hero-media-poster" aria-hidden="true"
      />
      {load && (
        <video
          ref={videoRef} src={video.src} poster={poster}
          className={`hero-media-video${playing ? " is-playing" : ""}`}
          muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1}
          disablePictureInPicture disableRemotePlayback
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => { setPlaying(false); setFailed(true); }}
        />
      )}
      <div className="hero-media-scrim" aria-hidden="true" />
      {approved && load && (
        <button type="button" className="hero-media-control" onClick={togglePlayback}>
          <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
          {playing ? text.pause : text.resume}
        </button>
      )}
      {approved && !load && preferences.hydrated && (
        <span className="hero-media-status" role={failed ? "status" : undefined}>
          {failed ? text.unavailable : text.still}
        </span>
      )}
    </div>
  );
}
