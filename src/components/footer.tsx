import { Link } from "@/components/ui/link";
import Image from "next/image";
import { brandLogo, brandLogoRendition } from "@/content/brand-identity";
import { Container } from "@/components/ui/container";
import { homepageNarrative } from "@/content/homepage-narrative";
import { publicSitemap } from "@/content/public-site";
import type { Locale } from "@/lib/i18n";
export const footerCopy = {
  en: {
    description: "The fifth Medical Students Research Conference.",
    institution: "King Abdulaziz University · Jeddah",
    navigation: "Explore the conference",
    groups: ["The conference", "Take part", "Information"],
    designSystem: "Design system preview",
    soon: "Soon",
  },
  ar: {
    description: "المؤتمر الخامس لأبحاث طلاب الطب.",
    institution: "جامعة الملك عبدالعزيز · جدة",
    navigation: "استكشف المؤتمر",
    groups: ["المؤتمر", "المشاركة", "معلومات"],
    designSystem: "معاينة نظام التصميم",
    soon: "قريبًا",
  },
} as const;

const directoryGroups = [
  ["home", "dates", "program", "speakers", "teams"],
  ["workshops", "participation", "research", "sponsors", "gallery"],
  ["announcements", "faq", "contact", "privacy", "terms"],
] as const;

export function Footer({locale, showDesignSystem = false}: {locale: Locale; showDesignSystem?: boolean}) {
  const footer = footerCopy[locale];
  return (
      <footer className="site-footer" data-header-section="dark">
        <Container>
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-wordmark" dir="ltr" aria-hidden="true"><Image src={brandLogo.onPurple} alt="" width={brandLogoRendition.width} height={brandLogoRendition.height} loading="eager" unoptimized className="footer-logo" /><span className="brand-word" lang="en">MSRC’27</span></div>
              <span className="footer-identity sr-only" dir="ltr" lang="en">MSRC<span>2027</span></span>
              <div className="footer-brand-copy">
                <p>{footer.description}</p>
                <p className="footer-institution">{footer.institution}</p>
              </div>
            </div>
            <nav className="footer-directory" aria-label={footer.navigation}>
              {directoryGroups.map((ids, index) => (
                <div className="footer-directory-group" key={footer.groups[index]}>
                  <h2>{footer.groups[index]}</h2>
                  <ul>
                    {ids.map((id) => publicSitemap.find((page) => page.id === id)!).map((page) => (
                      <li key={page.id}>
                        {page.previewHref ? (
                          <Link href={`/${locale}${page.previewHref === "/" ? "" : page.previewHref.replace(/^\/#/, "#")}`}>{page.label[locale]}</Link>
                        ) : (
                          // DECISIONS: unpublished entries stay visibly and semantically disabled.
                          <span className="footer-unpublished" role="link" aria-disabled="true">{page.label[locale]} <span className="footer-soon">{footer.soon}</span></span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="footer-bottom">
            <p dir="ltr" lang="en">MSRC / 2027</p>
            {/* ORG-038: the Research Principles Club organizes on behalf of the Faculty of Medicine, KAU. */}
            <p className="footer-organizer">{homepageNarrative[locale].organizer}</p>
            {showDesignSystem ? <Link href={`/${locale}/design-system`}>{footer.designSystem}</Link> : null}
          </div>
        </Container>
      </footer>
  );
}
