import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPolicyDocument, type PolicyKind, type PolicyVersion } from "@/content/policies";
import type { Locale } from "@/lib/i18n";

export function PolicyPage({
  kind,
  locale,
  version,
  dated = false,
}: {
  kind: PolicyKind;
  locale: Locale;
  version?: PolicyVersion;
  dated?: boolean;
}) {
  const snapshot = getPolicyDocument(kind, locale, version);
  const { labels, document } = snapshot;
  const other = kind === "privacy" ? "terms" : "privacy";

  return (
    <div className="policy-page" data-policy-kind={kind} data-policy-version={snapshot.version}>
      <section className="policy-hero" aria-labelledby="policy-page-title">
        <Container>
          <nav aria-label={labels.breadcrumb} className="about-breadcrumb">
            <ol>
              <li><Link href={`/${locale}`}>{labels.home}</Link></li>
              <li><span aria-hidden="true">/</span><span aria-current="page">{document.title}</span></li>
            </ol>
          </nav>
          <div className="policy-hero-grid">
            <div>
              <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{labels.eyebrow}</p>
              <h1 id="policy-page-title">{document.title}</h1>
              <p className="policy-lead">{document.lead}</p>
            </div>
            <dl className="policy-version-details">
              <div><dt>{labels.version}</dt><dd><bdi dir="ltr">{snapshot.version}</bdi></dd></div>
              <div><dt>{labels.recorded}</dt><dd><time dateTime={snapshot.recordedOn}>{labels.recordedDate}</time></dd></div>
            </dl>
          </div>
          <div className="policy-draft-notice" aria-describedby="policy-approval-notice">
            <StatusBadge tone="warning">{labels.status}</StatusBadge>
            <p id="policy-approval-notice">{labels.approvalNotice}</p>
            <Link className="text-link policy-version-link" href={dated ? `/${locale}/${kind}` : `/${locale}/${kind}/${snapshot.version}`}>
              {dated ? labels.latestLink : labels.versionLink}
            </Link>
          </div>
        </Container>
      </section>

      <Container className="policy-reading-layout">
        <nav className="policy-contents" aria-label={labels.contents}>
          <h2>{labels.contents}</h2>
          <ol>{document.sections.map((section) => (
            <li key={section.id}><Link href={`#${section.id}`}>{section.title}</Link></li>
          ))}</ol>
        </nav>
        <div className="policy-sections">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} tabIndex={-1} className="policy-section" aria-labelledby={`${section.id}-title`} data-policy-section-status={section.status}>
              <SectionHeading title={section.title} id={`${section.id}-title`} />
              <p className="policy-section-status">{section.status === "placeholder" ? labels.placeholderStatus : labels.decisionStatus}</p>
              {section.paragraphs.map((paragraph) => <p className="policy-body" key={paragraph}>{paragraph}</p>)}
              {section.links ? <ul className="policy-links">{section.links.map((link) => (
                <li key={link.href}><a className="text-link" href={link.href} dir={link.direction}>{link.label}</a></li>
              ))}</ul> : null}
            </section>
          ))}
          <nav className="policy-related" aria-label={labels.related}>
            <Link className="text-link" href={`/${locale}/${other}`}>{labels[other].title}</Link>
            <Link className="text-link" href={`/${locale}/contact`}>{labels.contact}</Link>
          </nav>
        </div>
      </Container>
    </div>
  );
}
