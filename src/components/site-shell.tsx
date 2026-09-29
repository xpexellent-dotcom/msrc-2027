import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { dictionaries, type Locale } from "@/lib/i18n";

export function SiteShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const copy = dictionaries[locale];

  return (
    <>
      <a className="skip-link" href="#main-content">{copy.skip}</a>
      <div className="preview-banner">
        <div className="site-container preview-banner-inner">
          <span className="preview-label"><span aria-hidden="true" />{copy.preview}</span>
          <span className="preview-edition" dir="ltr">MSRC 2027</span>
        </div>
      </div>
      <header className="site-header site-container">
        <Link className="wordmark" href={`/${locale}`} aria-label="MSRC 2027">
          <span dir="ltr">MSRC<span className="wordmark-year">2027</span></span>
        </Link>
        <LanguageSwitch locale={locale} />
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="site-footer site-container">
        <span dir="ltr" className="footer-identity">MSRC 2027</span>
        <p>{copy.footer}</p>
      </footer>
    </>
  );
}
