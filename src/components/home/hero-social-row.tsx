import { footerCopy } from "@/components/footer";
import { SocialGlyph } from "@/components/social-glyphs";
import { socialLinks, socialNetworkName, type SocialLink } from "@/content/social-links";
import type { Locale } from "@/lib/i18n";

export function HeroSocialRow({ locale, links = socialLinks }: { locale: Locale; links?: readonly SocialLink[] }) {
  if (links.length === 0) return null;
  const soon = footerCopy[locale].soon;

  return (
    <ul className="hero-social" role="list">
      {links.map(({ network, url }) => (
        <li key={network}>
          {url ? (
            <a className="social-item" href={url} rel="me noopener">
              <SocialGlyph network={network} />
              <span className="sr-only">{socialNetworkName[network]}</span>
            </a>
          ) : (
            <span className="social-item social-item--placeholder">
              <SocialGlyph network={network} />
              <span className="sr-only">{`${socialNetworkName[network]} — ${soon}`}</span>
            </span>
          )}
        </li>
      ))}
      {links.some(({ url }) => !url) && (
        <li className="social-soon" aria-hidden="true"><span>{soon}</span></li>
      )}
    </ul>
  );
}
