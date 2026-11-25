import Image from "next/image";

export type BrandIconName =
  | "01-research"
  | "06-publications"
  | "11-speakers"
  | "12-posters"
  | "13-collaboration"
  | "14-awards"
  | "15-schedule"
  | "16-global"
  | "17-education"
  | "19-workshops"
  | "20-hackathon"
  | "21-3mt"
  | "22-partners"
  | "23-venue"
  | "24-gallery"
  | "25-faq"
  | "26-contact"
  | "27-tickets";

/** Official owner-supplied artwork. Preserve its colours and physical centring. */
export function BrandIcon({ name, size = 56, className = "" }: { name: BrandIconName; size?: number; className?: string }) {
  return (
    <span className={`brand-icon ${className}`.trim()} aria-hidden="true">
      <Image src={`/brand/identity/icons/${name}.webp`} alt="" width={size} height={size} loading="lazy" />
    </span>
  );
}
