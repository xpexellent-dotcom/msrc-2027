"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/** Approved city derivative. Mounted on approach, never for reduced motion/data saving. */
export function ClosingCity({ children, locale, video, poster }: { children: ReactNode; locale: Locale; video: string; poster: string }) {
  const section = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [canLoad, setCanLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setCanLoad(!motion.matches && !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? ""));
    update();
    const observer = typeof IntersectionObserver === "undefined" ? null
      : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "160px" });
    if (section.current) observer?.observe(section.current);
    motion.addEventListener("change", update);
    connection?.addEventListener("change", update);
    return () => { observer?.disconnect(); motion.removeEventListener("change", update); connection?.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    const element = film.current;
    if (!element) return;
    const sync = () => {
      if (visible && !paused && document.visibilityState === "visible") void element.play().catch(() => setPlaying(false));
      else element.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { document.removeEventListener("visibilitychange", sync); element.pause(); };
  }, [canLoad, visible, paused, failed]);
  return <section className="closing-section city-closing" aria-labelledby="closing-title" ref={section}>
    <div className="city-media" aria-hidden="true"><Image src={poster} alt="" fill sizes="100vw" />
      {canLoad && visible && !failed && <video ref={film} src={video} poster={poster} muted loop playsInline preload="none" tabIndex={-1}
        onError={() => setFailed(true)} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
    </div>
    {children}
    {canLoad && visible && !failed && <button type="button" className="city-control" onClick={() => {
      if (!playing) { setPaused(false); void film.current?.play().catch(() => setPlaying(false)); }
      else setPaused(true);
    }} aria-label={playing ? locale === "ar" ? "إيقاف فيديو جدة" : "Pause Jeddah video" : locale === "ar" ? "تشغيل فيديو جدة" : "Play Jeddah video"}>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">{playing ? <path d="M7 4v12M13 4v12" stroke="currentColor" strokeWidth="2" /> : <path d="m6 4 9 6-9 6V4Z" fill="currentColor" />}</svg>
    </button>}
  </section>;
}
