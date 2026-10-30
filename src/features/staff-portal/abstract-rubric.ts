/** ENG-090 / ORG-069. Owner-approved 2027 constants, never staff editable. */
export const ABSTRACT_SCORING_RULE = "msrc2027_org069";
export const ABSTRACT_RUBRIC = [
  { id: "significance", label: "Significance and Contribution", weight: 20, min: 1, max: 4 },
  { id: "objectives", label: "Research Question and Objectives", weight: 15, min: 1, max: 4 },
  { id: "methodology", label: "Methodology and Rigor", weight: 20, min: 1, max: 4 },
  { id: "results", label: "Results and Alignment", weight: 15, min: 1, max: 4 },
  { id: "conclusions", label: "Conclusions and Impact", weight: 10, min: 1, max: 4 },
  { id: "clarity", label: "Clarity and Writing", weight: 10, min: 1, max: 4 },
  { id: "structure", label: "Structure and Completeness", weight: 10, min: 1, max: 4 },
] as const;
export type AbstractCriterionId = typeof ABSTRACT_RUBRIC[number]["id"];
/** English reviewer copy transcribed from the owner's rubric; order is 1..4. */
export const ABSTRACT_ANCHORS: Record<AbstractCriterionId, readonly [string, string, string, string]> = {
  significance: [
    "No clear reason given for why the study matters",
    "Significance is stated in general terms without supporting evidence",
    "Important and useful question, but the contribution is limited or partly duplicates existing work",
    "Addresses an important clinical, scientific, or public-health question; clearly identifies the knowledge gap or problem; and explains the potential contribution of the findings to clinical practice, decision-making, future research, or health policy.",
  ],
  objectives: [
    "No research question or objectives stated",
    "Question is general or objectives are unclear",
    "Clear question, but some objectives are not measurable",
    "Presents a clear, specific research question or objective appropriate to the study design, with reported findings that address the stated objective(s).",
  ],
  methodology: [
    "No clear design, or the methods do not support the research question",
    "Design is mentioned without enough detail, or has gaps that could affect the results",
    "Design is clear, but one or more elements are missing (e.g., sample size justification or analysis method)",
    "Clearly describes the study design and the essential methods appropriate to the research question, including the relevant population or data sources, selection procedures, measurements or data collection, and analytical approach. The methods are appropriate and sufficiently detailed to support the validity and interpretation of the findings.",
  ],
  results: [
    "No results reported, or results do not answer the research question",
    "General results with insufficient detail",
    "Key results are present, but some are not linked to objectives",
    "Reports the main findings with sufficient detail for the study type, including appropriate numerical estimates and measures of uncertainty for quantitative studies, or clearly described themes and supporting evidence for qualitative studies. The findings directly address the stated research question or objectives.",
  ],
  conclusions: [
    "Conclusion is unsupported or missing",
    "Conclusion goes beyond what the results support",
    "Conclusion is logical, but limitations are not mentioned",
    "Draws conclusions that are directly supported by the findings, acknowledges important study limitations, and explains the potential implications without making claims beyond the available evidence.",
  ],
  clarity: [
    "Difficult to understand, or errors are frequent",
    "Some sentences are unclear, and errors sometimes affect comprehension",
    "Understandable, with minor errors or phrasing that needs revision",
    "Precise, concise language with no errors that affect comprehension, correct medical terminology, and abbreviations defined at first use",
  ],
  structure: [
    "No clear structure, or most elements are missing",
    "More than one element is missing, or the structure is not followed",
    "One element is missing, or one piece of information is incomplete",
    "Follows the required structure for the relevant study type, with all essential sections present and sufficient information provided to understand the study's purpose, methods, findings, and conclusions.",
  ],
};
export type CriterionScore = { criterionId: string; value: number };
/** Sum integer weighted increments first; round only the complete total (SQL numeric parity). */
export function abstractWeightedTotal(scores: readonly CriterionScore[]): number | null {
  if (scores.length !== ABSTRACT_RUBRIC.length || new Set(scores.map((s) => s.criterionId)).size !== scores.length) return null;
  let numerator = 0;
  for (const criterion of ABSTRACT_RUBRIC) {
    const score = scores.find((s) => s.criterionId === criterion.id)?.value;
    if (!Number.isInteger(score) || score! < 1 || score! > 4) return null;
    numerator += criterion.weight * (score! - 1);
  }
  return Math.round(numerator * 100 / 3) / 100;
}
export type DecisionBands = { oralMin: number; posterMin: number; borderlineMin: number; acceptanceMin: number };
/** Suggestions only. The acceptance threshold and capacity have no owner-supplied default. */
export const SUGGESTED_ABSTRACT_BANDS = { oralMin: 85, posterMin: 60, borderlineMin: 55 } as const;
export type RecommendedBand = "settings_unset" | "screening_required" | "investigation" | "reviews_incomplete" | "oral_candidate" | "poster" | "borderline" | "additional_review" | "reject";
export function provisionalAbstractBand(mean: number, reviews: readonly (readonly CriterionScore[])[], bands: DecisionBands | null, oralAvailable: boolean | null = null): RecommendedBand {
  if (!bands) return "settings_unset";
  if (!Number.isFinite(mean) || mean < 0 || mean > 100 || reviews.length < 2 || reviews.some((scores) => abstractWeightedTotal(scores) === null)) return "reviews_incomplete";
  const oralQuality = reviews.every((scores) => ["methodology", "results"].every((id) => scores.find((s) => s.criterionId === id)!.value >= 3));
  if (mean >= bands.oralMin && oralQuality && oralAvailable !== false) return "oral_candidate";
  if (mean >= bands.posterMin) return "poster";
  if (mean >= bands.borderlineMin) return "borderline";
  return mean < bands.acceptanceMin ? "reject" : "additional_review";
}
