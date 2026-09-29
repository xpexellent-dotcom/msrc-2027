import { Link } from "@/components/ui/link";
import { Container } from "@/components/ui/container";
import { publicSitemap } from "@/content/public-site";
import { dictionaries, type Locale } from "@/lib/i18n";
const footerCopy = {
  en: {
    description: "The fifth Medical Students Research Conference.",
    institution: "King Abdulaziz University · Jeddah",
    navigation: "Explore the conference",
    forthcoming: "More information is on its way.",
    unpublished: "Marked pages are awaiting content.",
    contentPending: "Awaiting content",
    designSystem: "Design system preview",
    edition: "An idea. A question. The next chapter.",
  },
  ar: {
    description: "مؤتمر أبحاث طلاب الطب الخامس.",
    institution: "جامعة الملك عبدالعزيز · جدة",
    navigation: "استكشف المؤتمر",
    forthcoming: "المزيد من المعلومات قريبًا.",
    unpublished: "الصفحات المحددة بانتظار المحتوى.",
    contentPending: "بانتظار المحتوى",
    designSystem: "معاينة نظام التصميم",
    edition: "فكرة. سؤال. فصل جديد.",
  },
} as const;

export function Footer({locale, showDesignSystem = false}: {locale: Locale; showDesignSystem?: boolean}) {
  const copy = dictionaries[locale];
  const footer = footerCopy[locale];
  return (      <footer className="site-footer">
        <Container>
          <div className="footer-top">
            <div className="footer-brand">
              <span className="footer-identity" dir="ltr">MSRC<span>2027</span></span>
              <p>{footer.description}</p>
              <p className="footer-institution">{footer.institution}</p>
              <p className="footer-tagline">{footer.edition}</p>
            </div>
            <div className="footer-directory">
              <h2>{footer.navigation}</h2>
              <p className="footer-directory-note">{footer.unpublished}</p>
              <ul>
                {publicSitemap.map((page) => (
                  <li key={page.id}>
                    {page.previewHref ? (
                      <Link href={`/${locale}${page.previewHref === "/" ? "" : page.previewHref.replace(/^\/#/, "#")}`}>{page.label[locale]}</Link>
                    ) : (
                      <span className="footer-unpublished">{page.label[locale]}<span className="sr-only"> — {footer.contentPending}</span><span className="footer-pending-mark" aria-hidden="true">·</span></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>{copy.footer}</p>
            {showDesignSystem ? <Link href={`/${locale}/design-system`}>{footer.designSystem}<span aria-hidden="true"> ↗</span></Link> : <p>{footer.forthcoming}</p>}
          </div>
        </Container>
      </footer>
  );
}
