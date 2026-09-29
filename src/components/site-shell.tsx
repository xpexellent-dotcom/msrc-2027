import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { Container } from "@/components/ui/container";

import { dictionaries, type Locale } from "@/lib/i18n";

export function SiteShell({ children, locale, showDesignSystem = false }: {
  children: React.ReactNode;
  locale: Locale;
  showDesignSystem?: boolean;
}) {
  const copy = dictionaries[locale];


  return (
    <>
      <a className="skip-link" href="#main-content">{copy.skip}</a>
      <div className="preview-banner">
        <Container className="preview-banner-inner">
          <span className="preview-label"><span aria-hidden="true" />{copy.preview}</span>
          <span className="preview-edition" dir="ltr">MSRC 2027</span>
        </Container>
      </div>
      <SiteHeader locale={locale} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer locale={locale} showDesignSystem={showDesignSystem} />
    </>
  );
}
