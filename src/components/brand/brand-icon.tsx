import Image from "next/image";

type SuppliedBrandIconName =
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

const vectorIcons = {
  "28-cme-hours": "28-cme-hours.svg",
  "29-certificate": "29-certificate.svg",
} as const;

export type BrandIconName = SuppliedBrandIconName | keyof typeof vectorIcons;

/** Conference artwork retains its colours and physical centring in both languages. */
export function BrandIcon({ name, size = 56, className = "" }: { name: BrandIconName; size?: number; className?: string }) {
  const file = name in vectorIcons ? vectorIcons[name as keyof typeof vectorIcons] : `${name}.webp`;
  return (
    <span className={`brand-icon ${className}`.trim()} aria-hidden="true">
      <Image src={`/brand/identity/icons/${file}`} alt="" width={size} height={size} loading="lazy" />
    </span>
  );
}
