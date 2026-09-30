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
      {/* A named region keeps the status notice inside a landmark for screen-reader navigation. */}
      <section className="preview-banner" aria-label={copy.siteStatus}>
        <Container className="preview-banner-inner">
          <span className="preview-label"><span aria-hidden="true" />{copy.preview}</span>
          <span className="preview-edition" dir="ltr" lang="en">MSRC 2027</span>
        </Container>
      </section>
      <SiteHeader locale={locale} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer locale={locale} showDesignSystem={showDesignSystem} />
    </>
  );
}
