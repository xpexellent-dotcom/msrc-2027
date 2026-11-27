import { SocialGlyph } from "@/components/social-glyphs";
import { socialLinks, socialLinkCopy, socialNetworkName, type SocialLink } from "@/content/social-links";
import type { Locale } from "@/lib/i18n";

export function SocialLinksRow({
  locale,
  className,
  links = socialLinks,
}: {
  locale: Locale;
  className: string;
  links?: readonly SocialLink[];
}) {
  if (links.length === 0) return null;
  const copy = socialLinkCopy[locale];

  return (
    <ul className={`social-links ${className}`} role="list" aria-label={copy.label}>
      {links.map(({ network, url }) => (
        <li key={network}>
          {url ? (
            <a className="social-item" href={url} rel="me noopener">
              <SocialGlyph network={network} />
              <span className="sr-only" lang="en">{socialNetworkName[network]}</span>
            </a>
          ) : (
            <span className="social-item social-item--placeholder">
              <SocialGlyph network={network} />
              <span className="sr-only"><span lang="en">{socialNetworkName[network]}</span>{" — "}{copy.soon}</span>
            </span>
          )}
        </li>
      ))}
      {links.some(({ url }) => !url) && (
        <li className="social-soon" aria-hidden="true"><span>{copy.soon}</span></li>
      )}
    </ul>
  );
}
