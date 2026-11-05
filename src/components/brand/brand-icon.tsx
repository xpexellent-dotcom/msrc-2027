import Image from "next/image";

export type BrandIconName = "01-research" | "06-publications" | "12-posters" | "13-collaboration" | "14-awards" | "15-schedule" | "16-global" | "17-education" | "19-workshops" | "20-hackathon";

/** Official owner-supplied artwork. Never recolour or mirror its physical centring correction. */
export function BrandIcon({ name, size = 56, className = "" }: { name: BrandIconName; size?: number; className?: string }) {
  return <span className={`brand-icon ${className}`.trim()}><Image src={`/brand/identity/icons/${name}.webp`} alt="" width={size} height={size} loading="lazy" /></span>;
}
