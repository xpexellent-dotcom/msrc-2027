import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatIndex, type Locale } from "@/lib/i18n";
import { AbstractRoadmap } from "./abstract-roadmap";
import { researchCompetitionCopy } from "./copy";
import { DecorativeNumeral } from "./decorative-numeral";
import { AbstractSubmissionCta } from "./submission-cta";

/** Decorative studies: a speaking lectern and a scientific poster's column grid. */
function PresentationStudy({ poster }: { poster: boolean }) {
  return <svg className="research-format-study" viewBox="0 0 180 120" fill="none" aria-hidden="true" focusable="false">
    {poster ? <>
      <path d="M42 11h96v98H42zM53 25h74M53 32h50M53 44h32v24H53zM94 44h33M94 52h33M94 60h24M53 79h32M53 87h32M53 95h24M94 73h33v22H94z" />
      <path className="research-format-study-accent" d="m58 61 7-8 7 5 8-10M99 88l7-6 7 3 8-7" />
    </> : <>
      <path d="M50 78h80l-12 31H62zM90 78V49c0-10 7-17 17-17h8M111 26l14 10M73 109h34" />
      <path d="M67 20c-16 11-16 33 0 44M54 9c-24 16-24 49 0 66M131 20c16 11 16 33 0 44M144 9c24 16 24 49 0 66" />
      <path className="research-format-study-accent" d="M77 88h26" />
    </>}
  </svg>;
}

export function ResearchCompetitionPage({ locale, reviewAllowed = false }: { locale: Locale; reviewAllowed?: boolean }) {
  const copy = researchCompetitionCopy[locale];
  const criterionNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return <div className="research-competition" data-testid="research-competition-page">
    <section className="research-hero" aria-labelledby="research-title">
      <Image className="research-hero-photo" src="/media/msrc-demo/share-research-manar-2560.jpg" alt="" fill sizes="100vw" priority />
      <Container><nav className="research-breadcrumb" aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"}><ol><li><Link href={`/${locale}`}>{copy.home}</Link></li><li aria-current="page">{copy.title}</li></ol></nav>
        <p className="research-kicker">{copy.kicker}</p><h1 id="research-title">{copy.title}</h1><p className="research-hero-intro">{copy.intro}</p><AbstractSubmissionCta locale={locale} reviewAllowed={reviewAllowed} />
      </Container>
    </section>
    <section className="research-section research-journey" aria-labelledby="research-journey"><Container><SectionHeading id="research-journey" title={copy.journey} /><AbstractRoadmap locale={locale} reveal /></Container></section>
    <section className="research-section research-presentations" aria-labelledby="research-presentations"><Container><SectionHeading id="research-presentations" title={copy.presentations} />
      <div className="research-presentation-grid">{[[copy.oral, copy.oralText], [copy.poster, copy.posterText]].map(([title, text], index) => <article className={`research-presentation-card research-presentation-card--${index === 0 ? "oral" : "poster"}`} key={title} aria-labelledby={`research-format-${index}`}>
        <div className="research-format-art" aria-hidden="true"><span className="research-format-numeral">{index === 0 ? "I" : "II"}</span><PresentationStudy poster={index === 1} /></div>
        <p className="research-format-label">{copy.formats[index]}</p><h3 id={`research-format-${index}`}>{title}</h3><p>{text}</p>
      </article>)}</div>
      <aside className="research-winners"><span className="research-winners-mark" aria-hidden="true"><i /><i /><i /></span><div><h3>{copy.distinction}</h3><p>{copy.winners}</p></div></aside>
    </Container></section>
    <section className="research-section" aria-labelledby="research-eligibility"><Container><SectionHeading id="research-eligibility" title={copy.eligibility} description={copy.eligibilityIntro} /><div className="research-eligibility-grid">{copy.eligibilityCards.map(([title, text]) => <article className="research-eligibility-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></Container></section>
    <section className="research-section" aria-labelledby="research-guidelines"><Container><SectionHeading id="research-guidelines" title={copy.guidelines} description={copy.guidelinesIntro} /><ol className="research-guidelines">{copy.sections.map(([title, text, range], index) => <li key={title}><span className="research-card-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span><div><h3>{title}</h3><p>{text}</p></div><span className="research-suggested">{range} {copy.suggested}</span></li>)}</ol><aside className="research-word-limit"><p><strong>{copy.wordLimit}</strong></p><p>{copy.headingCount}</p></aside></Container></section>
    <section className="research-section research-evaluation" aria-labelledby="research-evaluation"><Container><div className="research-rubric-panel">
      <div className="research-rubric-intro"><DecorativeNumeral locale={locale} className="research-criteria-count" value={formatIndex(copy.criteria.length, locale)} /><h2 id="research-evaluation">{copy.evaluation}</h2><p>{copy.evaluationIntro}</p></div>
      <ol className="research-criteria" role="list">{copy.criteria.map(([name, description], index) => <li key={name}><DecorativeNumeral locale={locale} className="research-criterion-number" value={locale === "ar" ? formatIndex(index + 1, locale) : criterionNumerals[index]} /><dl><dt>{name}</dt><dd>{description}</dd></dl></li>)}</ol>
    </div></Container></section>
    <section className="research-closing" aria-labelledby="research-closing"><Container><h2 id="research-closing">{copy.closing}</h2><p>{copy.closingText}</p><div className="research-closing-actions"><AbstractSubmissionCta locale={locale} reviewAllowed={reviewAllowed} /><Link href={`/${locale}/contact`} className="research-contact">{copy.contact}</Link></div></Container></section>
  </div>;
}
