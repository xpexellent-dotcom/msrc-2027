import { describe, expect, it } from "vitest";
import { filterMedia, filterSessions, published, type PublicMedia, type PublicSession } from "@/content/conference-experiences";

// Synthetic records stay inside tests. They are never a public conference schedule.
const base: PublicSession = {
  slug: "synthetic-talk", publication: "approved", day: "day1", title: "Synthetic research methods",
  description: "A synthetic discussion of evidence", topic: "Evidence", startAt: "2027-01-27T08:00:00Z",
  endAt: "2027-01-27T08:30:00Z", category: { id: "talk", label: { en: "Talk", ar: "محاضرة" } },
  room: "Synthetic Room A", speakerSlugs: [], objectives: [], recordingSlug: null,
};
const sessions: PublicSession[] = [
  { ...base, slug: "synthetic-later", startAt: "2027-01-27T10:00:00Z" },
  { ...base },
  { ...base, slug: "synthetic-parallel", room: "Synthetic Room B" },
  { ...base, slug: "synthetic-untimed", startAt: null, endAt: null },
  { ...base, slug: "synthetic-day2", day: "day2", title: "Synthetic clinical reasoning", category: { id: "workshop", label: { en: "Workshop", ar: "ورشة" } } },
  { ...base, slug: "private-draft", publication: "draft", title: "Not approved" },
];
const filters = { day: "all", category: "all", room: "all", query: "" } as const;

describe("public programme filtering (PRG-01, CMS-04)", () => {
  it("excludes unapproved records, preserves parallel rooms and sorts timed sessions before missing times", () => {
    const result = filterSessions(sessions, filters);
    expect(result.map((session) => session.slug)).toEqual(["synthetic-talk", "synthetic-parallel", "synthetic-later", "synthetic-untimed", "synthetic-day2"]);
    expect(result.filter((session) => session.startAt === base.startAt && session.day === "day1").map((session) => session.room)).toEqual(["Synthetic Room A", "Synthetic Room B"]);
  });
  it("combines day, category, room and a normalized scientific query", () => {
    expect(filterSessions(sessions, { day: "day2", category: "workshop", room: "Synthetic Room A", query: "  CLINICAL  " }).map((session) => session.slug)).toEqual(["synthetic-day2"]);
    expect(filterSessions(sessions, { ...filters, query: "not approved" })).toEqual([]);
    expect(filterSessions(sessions, { ...filters, day: "day1", category: "workshop" })).toEqual([]);
  });
  it("does not mutate the source catalogue while sorting and handles an empty published schedule", () => {
    const before = [...sessions];
    filterSessions(sessions, filters);
    expect(sessions).toEqual(before);
    expect(filterSessions([], filters)).toEqual([]);
  });
});

const mediaBase = { slug: "synthetic-recording", publication: "approved", title: "Synthetic session", description: "Synthetic only", edition: 2027, kind: "recording", topic: "Evidence", speakerNames: ["Synthetic Speaker"], durationSeconds: 1800, sessionSlug: null } as const;
const media: PublicMedia[] = [
  { ...mediaBase, access: "public", asset: "/synthetic-test-only.mp4", poster: null },
  { ...mediaBase, slug: "synthetic-pending", access: "pending" },
  { ...mediaBase, slug: "synthetic-restricted", access: "restricted" },
  { ...mediaBase, slug: "synthetic-previous", edition: 2026, kind: "highlight", access: "pending" },
  { ...mediaBase, slug: "private-media-draft", publication: "draft", access: "public", asset: "/private-test-only.mp4", poster: null },
];

describe("public media catalogue (MED-01/04, CMS-04)", () => {
  it("combines edition, kind and speaker/topic queries without exposing unapproved recordings", () => {
    expect(filterMedia(media, { edition: "2027", kind: "recording", query: "  SYNTHETIC SPEAKER " }).map((record) => record.slug)).toEqual(["synthetic-recording", "synthetic-pending", "synthetic-restricted"]);
    expect(filterMedia(media, { edition: "2026", kind: "highlight", query: "evidence" }).map((record) => record.slug)).toEqual(["synthetic-previous"]);
    expect(filterMedia(media, { edition: "2026", kind: "recording", query: "" })).toEqual([]);
  });
  it("keeps pending/restricted metadata without any asset URLs and never upgrades access", () => {
    const result = filterMedia(media, { edition: "all", kind: "all", query: "" });
    expect(result.find((record) => record.slug === "private-media-draft")).toBeUndefined();
    for (const record of result.filter((item) => item.access !== "public")) expect(record).not.toHaveProperty("asset");
    expect(result.find((record) => record.slug === "synthetic-restricted")?.access).toBe("restricted");
  });
  it("returns only publication-approved snapshots without changing source records", () => {
    const before = [...media];
    expect(published(media).every((record) => record.publication === "approved")).toBe(true);
    expect(media).toEqual(before);
    expect(published([])).toEqual([]);
  });
});
