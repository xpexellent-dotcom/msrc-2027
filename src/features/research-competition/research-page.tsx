import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatIndex, type Locale } from "@/lib/i18n";
import { AbstractRoadmap } from "./abstract-roadmap";
import { researchCompetitionCopy } from "./copy";
import { AbstractSubmissionCta } from "./submission-cta";

export function ResearchCompetitionPage({ locale }: { locale: Locale }) {
  const copy = researchCompetitionCopy[locale];
  return <div className="research-competition" data-testid="research-competition-page">
    <section className="research-hero" aria-labelledby="research-title">
      <Image className="research-hero-photo" src="/media/msrc-demo/share-research-manar-2560.jpg" alt="" fill sizes="100vw" priority />
      <Container><nav className="research-breadcrumb" aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"}><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li aria-current="page">{copy.title}</li></ol></nav>
        <p className="research-kicker">{copy.kicker}</p><h1 id="research-title">{copy.title}</h1><p className="research-hero-intro">{copy.intro}</p><AbstractSubmissionCta locale={locale} />
      </Container>
    </section>
    <section className="research-section research-journey" aria-labelledby="research-journey"><Container><SectionHeading id="research-journey" title={copy.journey} /><AbstractRoadmap locale={locale} /></Container></section>
    <section className="research-section research-presentations" aria-labelledby="research-presentations"><Container><SectionHeading id="research-presentations" title={copy.presentations} />
      <div className="research-presentation-grid">{[[copy.oral, copy.oralText], [copy.poster, copy.posterText]].map(([title, text], index) => <article className="research-presentation-card" key={title}><span className="research-card-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      <p className="research-winners">{copy.winners}</p>
    </Container></section>
    <section className="research-section" aria-labelledby="research-eligibility"><Container><SectionHeading id="research-eligibility" title={copy.eligibility} description={copy.eligibilityIntro} /><div className="research-eligibility-grid">{copy.eligibilityCards.map(([title, text]) => <article className="research-eligibility-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></Container></section>
    <section className="research-section research-prepare" aria-labelledby="research-prepare"><Container><div className="research-editorial-split"><SectionHeading id="research-prepare" title={copy.prepare} description={copy.prepareIntro} /><ul className="research-checklist">{copy.checklist.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul></div></Container></section>
    <section className="research-section" aria-labelledby="research-guidelines"><Container><SectionHeading id="research-guidelines" title={copy.guidelines} description={copy.guidelinesIntro} /><ol className="research-guidelines">{copy.sections.map(([title, text, range], index) => <li key={title}><span className="research-card-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span><div><h3>{title}</h3><p>{text}</p></div><span className="research-suggested">{range} {copy.suggested}</span></li>)}</ol><aside className="research-word-limit"><p><strong>{copy.wordLimit}</strong></p><p>{copy.headingCount}</p></aside></Container></section>
    <section className="research-section research-evaluation" aria-labelledby="research-evaluation"><Container><div className="research-editorial-split"><SectionHeading id="research-evaluation" title={copy.evaluation} description={copy.evaluationIntro} /><dl className="research-criteria">{copy.criteria.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl></div></Container></section>
    <section className="research-section" aria-labelledby="research-rules"><Container><div className="research-editorial-split"><SectionHeading id="research-rules" title={copy.rulesTitle} /><ul className="research-rules">{copy.rules.map(([name, text]) => <li key={name}><strong>{name}: </strong>{text}</li>)}</ul></div></Container></section>
    <section className="research-closing" aria-labelledby="research-closing"><Container><h2 id="research-closing">{copy.closing}</h2><p>{copy.closingText}</p><div className="research-closing-actions"><AbstractSubmissionCta locale={locale} /><Link href={`/${locale}/contact`} className="research-contact">{copy.contact}</Link></div></Container></section>
  </div>;
}
