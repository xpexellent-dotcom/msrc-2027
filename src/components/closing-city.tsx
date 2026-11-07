"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FlowRibbon } from "@/components/brand/flow-ribbon";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/** Approved city derivative. Mounted on approach, never for reduced motion/data saving. */
export function ClosingCity({ children, video, poster }: { children: ReactNode; video: string; poster: string }) {
  const section = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [canLoad, setCanLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ended, setEnded] = useState(false);
  const [approached, setApproached] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setCanLoad(!motion.matches && !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? ""));
    update();
    const observer = typeof IntersectionObserver === "undefined" ? null
      : new IntersectionObserver(([entry]) => { setVisible(entry.isIntersecting); if (entry.isIntersecting) setApproached(true); }, { threshold: 0 });
    if (section.current) observer?.observe(section.current);
    motion.addEventListener("change", update);
    connection?.addEventListener("change", update);
    return () => { observer?.disconnect(); motion.removeEventListener("change", update); connection?.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    const element = film.current;
    if (!element) return;
    const sync = () => {
      if (visible && !ended && document.visibilityState === "visible") void element.play().catch(() => {});
      else element.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { document.removeEventListener("visibilitychange", sync); element.pause(); };
  }, [canLoad, visible, ended, failed]);
  return <section data-header-section="dark" className="closing-section city-closing" aria-labelledby="closing-title" ref={section}>
    <FlowRibbon edge="top" />
    <div className="city-media" aria-hidden="true"><Image src={poster} alt="" fill sizes="100vw" />
      {canLoad && approached && !failed && <video ref={film} src={video} poster={poster} muted playsInline preload="none" tabIndex={-1}
        onError={() => setFailed(true)} onEnded={() => setEnded(true)} />}
    </div>
    {children}

  </section>;
}
