import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_HACKATHON_FINAL_RUBRIC, DEFAULT_HACKATHON_SCREENING_RUBRIC, HACKATHON_PITCH_GUIDANCE, HACKATHON_FINAL_FAIRNESS } from "@/features/competitions/rubric-defaults";
import { decodeCompetitionRubric } from "@/features/competitions/staff-contract";
import { emptyHackathonDocument } from "@/features/competitions/contracts";
import { countPitchWords, validateCompetitionDocument } from "@/features/competitions/validation";
import { participationJourneyCopy } from "@/content/participation-copy";

const compact = (value: string) => value.replace(/\s+/g, " ").trim();
describe("ORG-065 exact editable hackathon rubric defaults", () => {
  it.each([
    ["preliminary-screening.txt", DEFAULT_HACKATHON_SCREENING_RUBRIC, 4, 20, "screening-v1"],
    ["final-judging.txt", DEFAULT_HACKATHON_FINAL_RUBRIC, 7, 35, "final-v1"],
  ] as const)("retains %s wording and the 1–5 scale", (filename, rubric, count, total, version) => {
    const source = compact(readFileSync(new URL(`../../sources/hackathon-2027/${filename}`, import.meta.url), "utf8"));
    expect(rubric).toHaveLength(count);
    expect(rubric.reduce((sum, criterion) => sum + criterion.max, 0)).toBe(total);
    expect(decodeCompetitionRubric(rubric)).toEqual(rubric);
    for (const criterion of rubric) {
      expect(criterion.min).toBe(1); expect(criterion.max).toBe(5); expect(criterion.rubricVersion).toBe(version);
      expect(source).toContain(criterion.label);
      expect(criterion.questions).toHaveLength(2);
      for (const question of criterion.questions ?? []) expect(source).toContain(question);
      expect(criterion.scale?.map((point) => point.score)).toEqual([5, 4, 3, 2, 1]);
      for (const point of criterion.scale ?? []) { expect(source).toContain(point.label); expect(source).toContain(point.description); }
      for (const point of criterion.anchors ?? []) expect(source).toContain(point.description);
    }
  });
  it("uses criterion-specific final anchors and keeps prototype optional", () => {
    for (const criterion of DEFAULT_HACKATHON_FINAL_RUBRIC) expect(criterion.anchors?.map((point) => point.score)).toEqual([5, 3, 1]);
    expect(HACKATHON_FINAL_FAIRNESS).toContain("A prototype is optional.");
  });
  it("preserves edited guidance in snapshots and rejects malformed or identity-bearing metadata", () => {
    const edited = [{ ...DEFAULT_HACKATHON_SCREENING_RUBRIC[0], questions: ["Edited guiding question"], rubricVersion: "screening-v2" }];
    expect(decodeCompetitionRubric(edited)?.[0].questions).toEqual(["Edited guiding question"]);
    expect(decodeCompetitionRubric([{ ...edited[0], participantEmail: "private@example.invalid" }])).toBeNull();
    expect(decodeCompetitionRubric([{ ...edited[0], anchors: [{ score: 6, description: "Outside range" }] }])).toBeNull();
    expect(decodeCompetitionRubric([{ ...edited[0], scale: [{ score: 1, label: "Poor", description: "A" }, { score: 1, label: "Poor", description: "B" }] }])).toBeNull();
    expect(decodeCompetitionRubric([{ id: "legacy", label: "3MT criterion", min: 0, max: 7 }])).toEqual([{ id: "legacy", label: "3MT criterion", min: 0, max: 7 }]);
  });
});
describe("HAC-04 single English pitch boundary", () => {
  it("retains all five prompts as guidance rather than separate pitch fields", () => {
    const source = compact(readFileSync(new URL("../../sources/hackathon-2027/hackathon-framework.txt", import.meta.url), "utf8"));
    expect(HACKATHON_PITCH_GUIDANCE).toHaveLength(5);
    for (const prompt of HACKATHON_PITCH_GUIDANCE) expect(source).toContain(prompt);
  });
  it("excludes references and optional links from the 300-word pitch", () => {
    const document = { ...emptyHackathonDocument(), pitch: "evidence ".repeat(300), references: "reference ".repeat(500), links: ["https://example.invalid/demo"] };
    expect(countPitchWords(document.pitch)).toBe(300);
    expect(validateCompetitionDocument("hackathon", document)).not.toBeNull();
    expect(validateCompetitionDocument("hackathon", { ...document, pitch: document.pitch + "extra" })).toBeNull();
  });
});
describe("working public overview", () => {
  it.each(["en", "ar"] as const)("%s uses owner-selected tracks and leaves pending logistics unconfirmed", (locale) => {
    const copy = participationJourneyCopy[locale].hackathon;
    expect(copy.tracks?.items.map((track) => track.title)).toEqual(locale === "en" ? ["Evidence to Impact", "Research Reimagined"] : ["من الدليل إلى الأثر", "البحث برؤية جديدة"]);
    expect(copy.closedBody).toMatch(locale === "en" ? /to be confirmed/ : /بانتظار التأكيد/);
    expect(copy.goodToKnow?.points.join(" ")).toMatch(locale === "en" ? /entry is free/ : /مجانية/);
    expect(JSON.stringify(copy)).not.toMatch(/8 teams|16 total|MSRC27kau|Mini Auditorium/);
  });
});
