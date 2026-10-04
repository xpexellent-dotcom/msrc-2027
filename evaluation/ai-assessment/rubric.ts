/** Fixture criteria and ranges only. The committee must supply its approved rubric. */
export const SYNTHETIC_RUBRIC = Object.freeze({
  version: "UNAPPROVED-synthetic-v1",
  status: "UNAPPROVED" as const,
  criteria: Object.freeze([
    Object.freeze({ id: "question", label: "Synthetic question clarity", min: 0, max: 4 }),
    Object.freeze({ id: "methods", label: "Synthetic method description", min: 0, max: 4 }),
    Object.freeze({ id: "claims", label: "Synthetic support for stated claims", min: 0, max: 4 }),
  ]),
});
export const SYNTHETIC_MODEL = "claude-opus-5-5";
export const SYNTHETIC_PROMPT_VERSION = "ai-advisory-synthetic-v1";
