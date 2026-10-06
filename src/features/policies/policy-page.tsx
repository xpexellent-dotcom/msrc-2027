import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPolicyDocument, type PolicyBlock, type PolicyKind, type PolicyVersion } from "@/content/policies";
import { formatConferenceDate } from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";

/** Render only the approved Markdown emphasis and links; React escapes all text. */
function inlinePolicyText(text: string): ReactNode[] {
  const tokens = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https:\/\/[^\s)]+|\/[a-z0-9/.-]+)\)|(\((?:[a-z0-9-]+\.)+[a-z]{2,}\)|[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}|www\.(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(tokens)) {
    nodes.push(text.slice(cursor, match.index));
    nodes.push(match[1]
      ? <strong key={match.index}>{inlinePolicyText(match[1])}</strong>
      : match[4] ? <bdi key={match.index} dir="ltr">{match[4]}</bdi>
        : <a key={match.index} className="text-link" href={match[3]}>{match[2]}</a>);
    cursor = match.index + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}

function PolicyContentBlock({ block, sectionId }: { block: PolicyBlock; sectionId: string }) {
  if (block.type === "paragraph") return <p className="policy-body">{inlinePolicyText(block.text)}</p>;
  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";
    return <List className="policy-body policy-list">{block.items.map((item, index) => <li key={index}>{inlinePolicyText(item)}</li>)}</List>;
  }
  return (
    <table className="policy-table" aria-labelledby={`${sectionId}-title`}>
      <thead><tr>{block.headers.map((header, index) => <th key={index} scope="col">{inlinePolicyText(header)}</th>)}</tr></thead>
      <tbody>{block.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => column === 0
        ? <th key={column} scope="row">{inlinePolicyText(cell)}</th>
        : <td key={column}>{inlinePolicyText(cell)}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function PolicyPage({ kind, locale, version, dated = false }: {
  kind: PolicyKind; locale: Locale; version?: PolicyVersion; dated?: boolean;
}) {
  const snapshot = getPolicyDocument(kind, locale, version);
  const { labels, document } = snapshot;
  const other = kind === "privacy" ? "terms" : "privacy";
  return (
    <div className="policy-page" data-policy-kind={kind} data-policy-version={snapshot.version} data-policy-status={snapshot.status}>
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
            </div>
            <dl className="policy-version-details">
              <div><dt>{labels.version}</dt><dd>{labels.versionLabel}</dd></div>
              <div><dt>{labels.effective}</dt><dd><time dateTime={snapshot.effectiveOn}>{formatConferenceDate(snapshot.effectiveOn, locale)}</time></dd></div>
            </dl>
          </div>
          {document.lead.split(/\n\n+/).filter(Boolean).map((paragraph) => <p className="policy-lead" key={paragraph}>{inlinePolicyText(paragraph)}</p>)}
          <Link className="text-link policy-version-link" href={dated ? `/${locale}/${kind}` : `/${locale}/${kind}/${snapshot.version}`}>
            {dated ? labels.latestLink : labels.versionLink}
          </Link>
        </Container>
      </section>
      <Container className="policy-reading-layout">
        <nav className="policy-contents" aria-label={labels.contents}>
          <h2>{labels.contents}</h2>
          <ol>{document.sections.map((section) => <li key={section.id}><Link href={`#${section.id}`}>{section.title}</Link></li>)}</ol>
        </nav>
        <div className="policy-sections">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} tabIndex={-1} className="policy-section" aria-labelledby={`${section.id}-title`}>
              <SectionHeading title={section.title} id={`${section.id}-title`} />
              {section.blocks.map((block, index) => <PolicyContentBlock key={index} block={block} sectionId={section.id} />)}
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
