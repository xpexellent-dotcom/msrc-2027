import { BrandIcon } from "@/components/brand/brand-icon";
import { abstractDates } from "@/content/abstract-dates";
import { formatRegistrationOpeningDate } from "@/content/registration-opening";
import { formatIndex, type Locale } from "@/lib/i18n";
import { researchCompetitionCopy } from "./copy";
import { DecorativeNumeral } from "./decorative-numeral";
import { RoadmapReveal } from "./roadmap-reveal";

const stages = [
  { icon: "06-publications", dateIndices: [0, 1] },
  { icon: "25-faq", dateIndices: [2] },
  { icon: "17-education", dateIndices: [3, 4] },
  { icon: "26-contact", dateIndices: [5] },
  { icon: "15-schedule", dateIndices: [6] },
  { icon: "11-speakers", dateIndices: [] },
] as const;

type RoadmapProps = {
  locale: Locale;
  currentStep?: number;
  variant?: "public" | "receipt";
};

/** The illustrated public roadmap describes the process. The participant receipt retains its existing dates. */
export function AbstractRoadmap({ locale, currentStep, variant = "receipt" }: RoadmapProps) {
  const copy = researchCompetitionCopy[locale];
  const isPublic = variant === "public";
  const list = (
    <ol className={isPublic ? "research-roadmap research-roadmap--public" : "research-roadmap"} role="list" aria-label={copy.journey}>
      {stages.map(({ icon, dateIndices }, index) => {
        const step = copy.steps[index];
        const order = formatIndex(index + 1, locale);
        const number = <DecorativeNumeral locale={locale} className="research-step-number" value={locale === "en" ? order.padStart(2, "0") : order} />;
        return (
          <li key={step} tabIndex={0} aria-current={currentStep === index ? "step" : undefined}>
            {isPublic
              ? <div className="research-step-marker">{number}<BrandIcon name={icon} size={64} /></div>
              : number}
            <h3>{step}</h3>
            {!isPublic && dateIndices.length ? (
              <p className="research-step-date">
                {index === 1 ? `${copy.by} ` : index === 4 ? `${copy.from} ` : null}
                {dateIndices.map((dateIndex, part) => {
                  const { date } = abstractDates[dateIndex];
                  return <span key={date}>{part ? " – " : null}<time dateTime={date}>{formatRegistrationOpeningDate(`${date}T00:00:00+03:00`, locale, false)}</time></span>;
                })}
              </p>
            ) : null}
            <p className="research-step-detail">{copy.stepDetails[index]}</p>
            {currentStep === index ? <strong className="research-current-step">{copy.current}</strong> : null}
          </li>
        );
      })}
    </ol>
  );
  return isPublic ? <RoadmapReveal>{list}</RoadmapReveal> : list;
}
