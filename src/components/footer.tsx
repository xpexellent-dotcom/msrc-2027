import { Link } from "@/components/ui/link";
import { Container } from "@/components/ui/container";
import { publicSitemap } from "@/content/public-site";
import type { Locale } from "@/lib/i18n";
const footerCopy = {
  en: {
    description: "The fifth Medical Students Research Conference.",
    institution: "King Abdulaziz University · Jeddah",
    navigation: "Explore the conference",
    designSystem: "Design system preview",
  },
  ar: {
    description: "المؤتمر الخامس لأبحاث طلاب الطب.",
    institution: "جامعة الملك عبدالعزيز · جدة",
    navigation: "استكشف المؤتمر",
    designSystem: "معاينة نظام التصميم",
  },
} as const;

export function Footer({locale, showDesignSystem = false}: {locale: Locale; showDesignSystem?: boolean}) {
  const footer = footerCopy[locale];
  return (
      <footer className="site-footer">
        <Container>
          <div className="footer-top">
            <div className="footer-brand">
              <span className="footer-identity" dir="ltr" lang="en">MSRC<span>2027</span></span>
              <p>{footer.description}</p>
              <p className="footer-institution">{footer.institution}</p>
            </div>
            <div className="footer-directory">
              <h2>{footer.navigation}</h2>
              <ul>
                {publicSitemap.map((page) => (
                  <li key={page.id}>
                    {page.previewHref ? (
                      <Link href={`/${locale}${page.previewHref === "/" ? "" : page.previewHref.replace(/^\/#/, "#")}`}>{page.label[locale]}</Link>
                    ) : (
                      <span className="footer-unpublished" role="link" aria-disabled="true">{page.label[locale]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p dir="ltr" lang="en">MSRC / 2027</p>
            {showDesignSystem ? <Link href={`/${locale}/design-system`}>{footer.designSystem}</Link> : null}
          </div>
        </Container>
      </footer>
  );
}
