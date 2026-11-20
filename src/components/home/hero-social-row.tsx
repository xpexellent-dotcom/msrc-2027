import { footerCopy } from "@/components/footer";
import { SocialGlyph } from "@/components/social-glyphs";
import { socialLinks, socialNetworkName, socialRowModel, type SocialLink } from "@/content/social-links";
import type { Locale } from "@/lib/i18n";

/** Server-rendered social links, or non-interactive illustrative squares in preview. */
export function HeroSocialRow({ locale, placeholders, links = socialLinks }: { locale: Locale; placeholders: boolean; links?: readonly SocialLink[] }) {
  const model = socialRowModel(links, placeholders);
  if (!model) return null;
  return <ul className="hero-social" aria-hidden={model.live.length === 0 ? true : undefined}>
    {model.live.map((link) => <li key={link.network}><a className="social-item" href={link.url!} rel="me noopener"><SocialGlyph network={link.network} /><span className="sr-only">{socialNetworkName[link.network]}</span></a></li>)}
    {model.pending.map((network) => <li key={network} aria-hidden="true"><span className="social-item social-item--placeholder"><SocialGlyph network={network} /></span></li>)}
    {model.pending.length > 0 && <li className="social-soon" aria-hidden="true"><span>{footerCopy[locale].soon}</span></li>}
  </ul>;
}
