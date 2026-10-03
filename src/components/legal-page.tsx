import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LegalPageCopy } from "@/content/legal";
import type { Locale } from "@/lib/i18n";
import { localizedPageMetadata } from "@/lib/metadata";

/**
 * BL-PUB-06/08: draft notices stay out of search and the sitemap until an approved version
 * replaces them, so no search result presents unapproved wording as the conference's policy.
 */
export function draftPageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  return { ...localizedPageMetadata(locale, path, title, description), title, description, robots: { index: false, follow: true } };
}

export function LegalPage({ locale, copy }: { locale: Locale; copy: LegalPageCopy }) {
  return (
    <>
      <section className="legal-hero" aria-labelledby="legal-page-title">
        <Container>
          <nav aria-label={copy.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{copy.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{copy.page}</span></li>
            </ol>
          </nav>
          <div className="legal-hero-copy">
            <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{copy.eyebrow}</p>
            <h1 id="legal-page-title">{copy.title}</h1>
            <p className="legal-lead">{copy.lead}</p>
            <div className="legal-status" role="note">
              <StatusBadge tone="warning">{copy.status}</StatusBadge>
              <p>{copy.statusBody}</p>
              <p className="legal-version">{copy.version}</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="editorial-section legal-body">
        <Container>
          <div className="legal-grid">
            <nav className="legal-contents" aria-labelledby="legal-contents-title">
              <h2 id="legal-contents-title">{copy.contents}</h2>
              <ol>
                {copy.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
              </ol>
            </nav>
            <div className="legal-sections">
              {copy.sections.map((section) => (
                <section key={section.id} id={section.id} tabIndex={-1} aria-labelledby={`${section.id}-title`}>
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                  {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
