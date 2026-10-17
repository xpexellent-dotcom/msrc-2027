import { useId } from "react";

type TechArtVariant = "hero" | "field" | "closing";

const round = (value: number) => Math.round(value * 10) / 10;
const helixPoint = (progress: number, strand: 1 | -1) => {
  const phase = progress * Math.PI * 3.8 - Math.PI / 2;
  return { x: round(240 + Math.sin(phase) * 76 * strand), y: round(72 + progress * 416), phase };
};
const helixPath = (strand: 1 | -1) => Array.from({ length: 97 }, (_, index) => {
  const point = helixPoint(index / 96, strand);
  return `${index ? "L" : "M"}${point.x} ${point.y}`;
}).join(" ");
const strands = { violet: helixPath(1), gold: helixPath(-1) };
const rungs = Array.from({ length: 24 }, (_, index) => {
  const progress = (index + 1) / 25;
  const violet = helixPoint(progress, 1);
  const gold = helixPoint(progress, -1);
  const fade = Math.sin(progress * Math.PI);
  const depth = (Math.cos(violet.phase) + 1) / 2;
  return { violet, gold, fade, depth };
});

/** A single decorative beat, with padded bounds and transparent ends. */
function Electrocardiogram({ id }: { id: string }) {
  const path = "M24 88H976L1000 102L1048 28L1080 134L1110 72L1138 88H1416";
  return <>
    <defs>
      <linearGradient id={`${id}-pulse`} gradientUnits="userSpaceOnUse" x1="24" y1="0" x2="1416" y2="0">
        <stop offset="0" stopColor="#9b6bff" stopOpacity="0" />
        <stop offset=".12" stopColor="#9b6bff" stopOpacity=".65" />
        <stop offset=".52" stopColor="#9b6bff" />
        <stop offset=".72" stopColor="#c9a24a" />
        <stop offset=".79" stopColor="#c9a24a" />
        <stop offset=".89" stopColor="#9b6bff" stopOpacity=".7" />
        <stop offset="1" stopColor="#9b6bff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-pulse-glow`} filterUnits="userSpaceOnUse" x="0" y="0" width="1440" height="160" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>
    <g fill="none" stroke={`url(#${id}-pulse)`} strokeLinecap="round" strokeLinejoin="round">
      <path className="hackathon-ecg-glow" d={path} strokeWidth="7" opacity=".35" filter={`url(#${id}-pulse-glow)`} />
      <path className="hackathon-ecg-line" d={path} strokeWidth="1.8" />
    </g>
  </>;
}

/** Static DNA studies for the hero and Benefits, and a closing ECG fragment. */
export function HackathonTechArt({ variant = "hero" }: { variant?: TechArtVariant }) {
  const id = `hackathon-dna-${useId().replace(/:/g, "")}`;
  const closing = variant === "closing";
  return <div className={`hackathon-tech-art hackathon-tech-art--${variant}`} aria-hidden="true">
    <svg className={`hackathon-tech-svg ${closing ? "hackathon-ecg-svg" : "hackathon-dna-svg"}`} viewBox={closing ? "0 0 1440 160" : "0 0 480 560"} fill="none" aria-hidden="true" focusable="false">
      {closing ? <Electrocardiogram id={id} /> : <>
        <defs>
          <linearGradient id={`${id}-violet`} gradientUnits="userSpaceOnUse" x1="0" y1="72" x2="0" y2="488">
            <stop offset="0" stopColor="#9b6bff" stopOpacity="0" />
            <stop offset=".13" stopColor="#9b6bff" stopOpacity=".9" />
            <stop offset=".87" stopColor="#9b6bff" stopOpacity=".9" />
            <stop offset="1" stopColor="#9b6bff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} gradientUnits="userSpaceOnUse" x1="0" y1="72" x2="0" y2="488">
            <stop offset="0" stopColor="#c9a24a" stopOpacity="0" />
            <stop offset=".13" stopColor="#c9a24a" stopOpacity=".85" />
            <stop offset=".87" stopColor="#c9a24a" stopOpacity=".85" />
            <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-rung-forward`} gradientUnits="userSpaceOnUse" x1="164" y1="0" x2="316" y2="0">
            <stop stopColor="#9b6bff" />
            <stop offset="1" stopColor="#c9a24a" />
          </linearGradient>
          <linearGradient id={`${id}-rung-reverse`} gradientUnits="userSpaceOnUse" x1="316" y1="0" x2="164" y2="0">
            <stop stopColor="#9b6bff" />
            <stop offset="1" stopColor="#c9a24a" />
          </linearGradient>
        </defs>
        <g className="hackathon-dna" transform={`rotate(${variant === "field" ? -24 : 24} 240 280)`} strokeLinecap="round" strokeLinejoin="round">
          <g className="hackathon-dna-rungs" strokeWidth="1.2">
            {rungs.map(({ violet, gold, fade, depth }, index) => <path key={index} d={`M${violet.x} ${violet.y}H${gold.x}`} stroke={`url(#${id}-rung-${violet.x < gold.x ? "forward" : "reverse"})`} opacity={round(fade * (.24 + depth * .3))} />)}
          </g>
          <path className="hackathon-dna-strand hackathon-dna-strand--violet" d={strands.violet} stroke={`url(#${id}-violet)`} strokeWidth="1.6" />
          <path className="hackathon-dna-strand hackathon-dna-strand--gold" d={strands.gold} stroke={`url(#${id}-gold)`} strokeWidth="1.6" />
          <g className="hackathon-dna-dots" stroke="none">
            {rungs.map(({ violet, gold, fade, depth }, index) => <g key={index}>
              <circle className="hackathon-dna-dot hackathon-dna-dot--violet" cx={violet.x} cy={violet.y} r={round(2.1 + depth * .9)} fill="#9b6bff" opacity={round(fade * (.35 + depth * .65))} />
              <circle className="hackathon-dna-dot hackathon-dna-dot--gold" cx={gold.x} cy={gold.y} r={round(3 - depth * .9)} fill="#c9a24a" opacity={round(fade * (1 - depth * .65))} />
            </g>)}
          </g>
        </g>
      </>}
    </svg>
  </div>;
}

/** A full-width ECG strip; its containing section reserves the reading space. */
export function HackathonHeartbeat({ variant = "hero" }: { variant?: "hero" | "schedule" }) {
  const id = `hackathon-heartbeat-${useId().replace(/:/g, "")}`;
  return <div className={`hackathon-heartbeat hackathon-heartbeat--${variant}`} aria-hidden="true">
    <svg className="hackathon-heartbeat-svg" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false">
      <Electrocardiogram id={id} />
    </svg>
  </div>;
}
