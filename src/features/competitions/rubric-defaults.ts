import type { CompetitionCriterion, CompetitionScalePoint } from "./staff-contract";

/** ORG-065 / ENG-080: editable working defaults, not approval to open screening. */
export const HACKATHON_RUBRIC_VERSION = { screening: "screening-v1", final: "final-v1" } as const;
export const SCREENING_SCALE: CompetitionScalePoint[] = [
  { score: 5, label: "Excellent", description: "Both guiding questions convincingly addressed; strong support." },
  { score: 4, label: "Strong", description: "Both addressed well; only minor gaps." },
  { score: 3, label: "Adequate", description: "Core expectations met, but some development is needed." },
  { score: 2, label: "Weak", description: "Substantial gaps in explanation, justification or practicality." },
  { score: 1, label: "Poor", description: "Criterion largely unaddressed or unsupported." },
];
export const FINAL_JUDGING_SCALE: CompetitionScalePoint[] = [
  { score: 5, label: "Excellent", description: "Convincing, well-supported; no material deficiency." },
  { score: 4, label: "Strong", description: "Well addressed, with minor gaps." },
  { score: 3, label: "Adequate", description: "Core expectations met; substantive gaps remain." },
  { score: 2, label: "Weak", description: "Major deficiencies reduce confidence." },
  { score: 1, label: "Poor", description: "Criterion largely unclear, unsupported or unaddressed." },
];
const screening = (id: string, label: string, questions: string[]): CompetitionCriterion => ({ id, label, min: 1, max: 5, questions, scale: SCREENING_SCALE, rubricVersion: HACKATHON_RUBRIC_VERSION.screening });
const final = (id: string, label: string, questions: string[], anchors: [string, string, string]): CompetitionCriterion => ({ id, label, min: 1, max: 5, questions, scale: FINAL_JUDGING_SCALE, anchors: [5, 3, 1].map((score, index) => ({ score, description: anchors[index] })), rubricVersion: HACKATHON_RUBRIC_VERSION.final });
export const DEFAULT_HACKATHON_SCREENING_RUBRIC: CompetitionCriterion[] = [
  screening("problem_relevance", "Problem Relevance & Potential Impact", ["Is the problem clear, significant, and aligned with the selected track?", "If solved, would it meaningfully benefit the intended users?"]),
  screening("innovation_fit", "Innovation & Solution Fit", ["Does the proposed solution directly address the identified problem?", "Does it offer meaningful novelty or improvement over existing approaches?"]),
  screening("feasibility_development", "Feasibility & Development Potential", ["Is the idea realistic considering likely requirements, resources, and barriers?", "Is there a plausible pathway for further development?"]),
  screening("evidence_rationale", "Evidence & Rationale", ["Is the problem supported by credible research or other appropriate evidence?", "Is there a sound rationale for why the proposed solution could work?"]),
];
export const DEFAULT_HACKATHON_FINAL_RUBRIC: CompetitionCriterion[] = [
  final("problem_need", "Problem & Need", ["Is the unmet need specific, significant and relevant to the track?", "Are affected users, causes and context understood?"], ["clear, significant need, users and causes", "relevant but incomplete context", "vague or unjustified need"]),
  final("evidence_rationale", "Evidence & Scientific Rationale", ["Do credible sources support the problem and key claims?", "Is the approach justified, with uncertainties recognized?"], ["credible support and justified mechanism", "some support but important gaps", "unsupported or misinterpreted claims"]),
  final("innovation_fit", "Innovation & Solution Fit", ["Does the idea offer meaningful improvement or originality?", "Does it directly address the identified problem and users?"], ["meaningful advancement with strong fit", "reasonable fit, limited differentiation", "poor fit or negligible added value"]),
  final("feasibility_implementation", "Feasibility & Implementation", ["Is there a realistic pathway, with resources and barriers considered?", "Are stakeholders and relevant ethical or safety issues addressed?"], ["realistic pathway, barriers and safeguards", "plausible but incomplete plan", "unrealistic or major barriers ignored"]),
  final("impact_sustainability", "Impact & Sustainability", ["Are the expected benefits credible and assessable?", "Could the solution be maintained or adapted where appropriate?"], ["credible benefits, measures and continuation", "plausible but weak measurement or plan", "overstated or unclear likely benefit"]),
  final("pitch_communication", "Pitch & Communication", ["Is the 5-minute presentation clear, coherent and concise?", "Do visuals or demonstrations improve understanding?"], ["concise, coherent and easy to follow", "understandable but uneven or crowded", "unclear or substantially disorganized"]),
  final("qa_defense", "Q&A & Defense", ["Are answers direct, accurate and logically defended?", "Does the team acknowledge limitations and uncertainty?"], ["accurate, reasoned answers; honest limits", "adequate with significant knowledge gaps", "inaccurate, evasive or poorly understood"]),
];
export const HACKATHON_SCREENING_FAIRNESS = "Fairness: score the substantive content of the summary, deck and optional material. Do not separately reward polished design, videos, previous progress or a prototype.";
export const HACKATHON_FINAL_FAIRNESS = "Fairness rule: Evaluate conceptual merit, not slide design, charisma, commercial potential or possession of a prototype. A prototype is optional.";
export const HACKATHON_PITCH_GUIDANCE = ["Problem and target users or setting", "Relevant evidence and why the problem matters", "Proposed solution and how it works", "Novelty: how it differs from existing work", "Practical feasibility, expected impact and next steps"] as const;
