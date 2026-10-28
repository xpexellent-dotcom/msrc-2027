import { abstractDates } from "@/content/abstract-dates";
import { formatRegistrationOpeningDate } from "@/content/registration-opening";
import { formatIndex, type Locale } from "@/lib/i18n";
import { researchCompetitionCopy } from "./copy";

const roadmapDates = [[0, 1], [2], [3, 4], [5], [6], []] as const;
/** Shared with the participant's finalized receipt; dates are ORG-058 display data. */
export function AbstractRoadmap({ locale, currentStep }: { locale: Locale; currentStep?: number }) {
  const copy = researchCompetitionCopy[locale];
  return <ol className="research-roadmap" aria-label={copy.journey}>
    {copy.steps.map((step, index) => <li key={step} aria-current={currentStep === index ? "step" : undefined}>
      <span className="research-step-number" aria-hidden="true">{formatIndex(index + 1, locale)}</span>
      <h3>{step}</h3>
      {roadmapDates[index].length ? <p className="research-step-date">
        {index === 1 ? `${copy.by} ` : index === 4 ? `${copy.from} ` : null}
        {roadmapDates[index].map((dateIndex, part) => <span key={dateIndex}>{part ? " – " : null}<time dateTime={abstractDates[dateIndex].date}>{formatRegistrationOpeningDate(`${abstractDates[dateIndex].date}T00:00:00+03:00`, locale, false)}</time></span>)}
      </p> : null}
      <p>{copy.stepDetails[index]}</p>
      {currentStep === index ? <strong className="research-current-step">{copy.current}</strong> : null}
    </li>)}
  </ol>;
}
