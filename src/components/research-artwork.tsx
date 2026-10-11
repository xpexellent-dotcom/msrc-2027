"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export function ResearchArtwork({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => { setAllowed(!motion.matches && typeof IntersectionObserver !== "undefined"); setRunning(visible && !motion.matches && document.visibilityState === "visible"); };
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }) : null;
    if (root.current) observer?.observe(root.current);
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer?.disconnect(); motion.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <div ref={root} className="research-artwork" data-running={running && !paused}>
    <div className="research-artwork-image"><Image src="/media/msrc-demo/research-sculpture.jpg" alt="" fill sizes="(max-width: 800px) 92vw, 46vw" /></div>
    {allowed && <button className="artwork-control" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} aria-label={paused ? locale === "ar" ? "تشغيل الحركة" : "Play animation" : locale === "ar" ? "إيقاف الحركة" : "Pause animation"}>
      <svg viewBox="0 0 20 20" aria-hidden="true" fill="none">{paused ? <path d="m6 4 9 6-9 6V4Z" fill="currentColor" /> : <path d="M7 4v12M13 4v12" stroke="currentColor" strokeWidth="2" />}</svg>
    </button>}
  </div>;
}
