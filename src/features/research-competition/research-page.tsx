import Image from "next/image";
import { BrandIcon, type BrandIconName } from "@/components/brand/brand-icon";
import { FlowLines } from "@/components/brand/flow-lines";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatIndex, type Locale } from "@/lib/i18n";
import { AbstractRoadmap } from "./abstract-roadmap";
import { researchCompetitionCopy } from "./copy";
import { DecorativeNumeral } from "./decorative-numeral";
import { AbstractSubmissionCta } from "./submission-cta";

const eligibilityIcons: readonly BrandIconName[] = ["17-education", "11-speakers", "01-research"];

export function ResearchCompetitionPage({ locale }: { locale: Locale }) {
  const copy = researchCompetitionCopy[locale];
  const formats = [
    { id: "oral", heading: copy.oral, label: copy.formats[0], description: copy.oralText, icon: "11-speakers" },
    { id: "poster", heading: copy.poster, label: copy.formats[1], description: copy.posterText, icon: "12-posters" },
  ] as const;
  const criterionNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return <div className="research-competition" data-testid="research-competition-page">
    <section data-header-section="dark" className="research-hero" aria-labelledby="research-title">
      <Image className="research-hero-photo" src="/media/msrc-demo/share-research-manar-2560.jpg" alt="" fill sizes="100vw" priority />
      <Container><nav className="research-breadcrumb" aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"}><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li aria-current="page">{copy.title}</li></ol></nav>
        <p className="research-kicker">{copy.kicker}</p><h1 id="research-title">{copy.title}</h1><p className="research-hero-intro">{copy.intro}</p><AbstractSubmissionCta locale={locale} />
      </Container>
    </section>
    <nav className="research-index" aria-label={copy.title}>
      <Container>
        <ul>
          <li><Link href="#research-journey">{copy.journey}</Link></li>
          <li><Link href="#research-presentations">{copy.presentations}</Link></li>
          <li><Link href="#research-eligibility">{copy.eligibility}</Link></li>
          <li><Link href="#research-guidelines">{copy.guidelines}</Link></li>
          <li><Link href="#research-evaluation">{copy.evaluation}</Link></li>
        </ul>
      </Container>
    </nav>
    <section className="research-section research-journey" aria-labelledby="research-journey"><Container><SectionHeading id="research-journey" title={copy.journey} /><AbstractRoadmap locale={locale} variant="public" /></Container></section>
    <section className="research-section research-presentations" aria-labelledby="research-presentations">
      <Container>
        <SectionHeading id="research-presentations" title={copy.presentations} />
        <div className="research-presentation-grid">
          {formats.map(({ id, heading, label, description, icon }) => (
            <article key={id} className={`research-presentation-card research-presentation-card--${id}`} aria-labelledby={`research-format-${id}`}>
              <div className="research-format-art" aria-hidden="true"><BrandIcon name={icon} size={160} /></div>
              <div className="research-format-copy">
                <h3 id={`research-format-${id}`}>{heading}</h3>
                <p className="research-format-label">{label}</p>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="research-winners">
          <BrandIcon name="14-awards" size={80} />
          <div><h3>{copy.distinction}</h3><p>{copy.winners}</p></div>
        </aside>
      </Container>
    </section>
    <section className="research-section research-eligibility" aria-labelledby="research-eligibility">
      <Container>
        <SectionHeading id="research-eligibility" title={copy.eligibility} description={copy.eligibilityIntro} />
        <ul className="research-eligibility-list" role="list">
          {copy.eligibilityCards.map(([heading, description], index) => (
            <li key={heading}>
              <BrandIcon name={eligibilityIcons[index]} size={64} />
              <div><h3>{heading}</h3><p>{description}</p></div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
    <section className="research-section" aria-labelledby="research-guidelines"><Container><SectionHeading id="research-guidelines" title={copy.guidelines} description={copy.guidelinesIntro} /><ol className="research-guidelines">{copy.sections.map(([title, text, range], index) => <li key={title}><span className="research-card-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span><div><h3>{title}</h3><p>{text}</p></div><span className="research-suggested">{range} {copy.suggested}</span></li>)}</ol><aside className="research-word-limit"><p><strong>{copy.wordLimit}</strong></p><p>{copy.headingCount}</p></aside></Container></section>
    <section className="research-section research-evaluation" aria-labelledby="research-evaluation"><Container><div className="research-rubric-panel">
      <div className="research-rubric-intro"><span className="research-rubric-magnifier" aria-hidden="true" /><DecorativeNumeral locale={locale} className="research-criteria-count" value={formatIndex(copy.criteria.length, locale)} /><h2 id="research-evaluation">{copy.evaluation}</h2><p>{copy.evaluationIntro}</p></div>
      <ol className="research-criteria" role="list">{copy.criteria.map(([name, description], index) => <li key={name}><DecorativeNumeral locale={locale} className="research-criterion-number" value={locale === "ar" ? formatIndex(index + 1, locale) : criterionNumerals[index]} /><dl><dt>{name}</dt><dd>{description}</dd></dl></li>)}</ol>
    </div></Container></section>
    <section data-header-section="dark" className="research-closing" aria-labelledby="research-closing"><FlowLines className="research-closing-lines" /><Container><h2 id="research-closing">{copy.closing}</h2><p>{copy.closingText}</p><div className="research-closing-actions"><AbstractSubmissionCta locale={locale} /><Link href={`/${locale}/contact`} className="research-contact">{copy.contact}</Link></div></Container></section>
  </div>;
}
