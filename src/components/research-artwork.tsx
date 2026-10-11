"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function ResearchArtwork() {
  const root = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  const [running, setRunning] = useState(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => setRunning(!completed.current && visible && !motion.matches && document.visibilityState === "visible");
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }) : null;
    if (root.current) observer?.observe(root.current);
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer?.disconnect(); motion.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <div ref={root} className="research-artwork" data-running={running} data-settled={settled} aria-hidden="true">
    <div className="research-artwork-image" onAnimationEnd={() => { completed.current = true; setSettled(true); setRunning(false); }}><Image src="/media/msrc-demo/research-sculpture.jpg" alt="" fill sizes="(max-width: 800px) 92vw, 46vw" /></div>
  </div>;
}
