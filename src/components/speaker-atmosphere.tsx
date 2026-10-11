"use client";

import { useEffect, useRef, useState } from "react";

/** Quiet contour motion stays behind the reading surface and rests when unseen. */
export function SpeakerAtmosphere() {
  const root = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      const canAnimate = !motion.matches && typeof IntersectionObserver !== "undefined";
      if (motion.matches) finished.current = true;
      setRunning(canAnimate && !finished.current && visible && document.visibilityState === "visible");
    };
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }) : null;
    if (root.current) observer?.observe(root.current);
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <div ref={root} className="speaker-atmosphere" data-running={running} onAnimationEnd={(event) => {
    if (event.animationName === "speaker-orbit") { finished.current = true; setRunning(false); }
  }}>
    <div className="speaker-contours" aria-hidden="true">
      <svg viewBox="0 0 1440 1000" fill="none" preserveAspectRatio="xMidYMid slice">
        <g className="speaker-contour-orbit">
          {Array.from({ length: 9 }, (_, index) => <ellipse key={index} cx="1100" cy="360" rx={300 + index * 48} ry={105 + index * 35} transform="rotate(-32 1100 360)" />)}
        </g>
        <g className="speaker-contour-echo">
          {Array.from({ length: 5 }, (_, index) => <ellipse key={index} cx="170" cy="820" rx={240 + index * 60} ry={100 + index * 42} transform="rotate(28 170 820)" />)}
        </g>
      </svg>
    </div>
  </div>;
}
