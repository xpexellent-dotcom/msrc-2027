import { describe, expect, it } from "vitest";
import { filterSessions, type PublicSession } from "@/content/conference-experiences";
import { emptyContentFields } from "@/features/staff-portal/content-contract";
import { formatProgramTime, groupProgramSlots, invalidSessionRange, sessionsOverlap } from "@/features/program/schedule";

const session = (slug: string, overrides: Partial<PublicSession> = {}): PublicSession => ({ slug, publication: "approved", day: "day1", title: "Synthetic", description: "", startAt: "2027-01-27T09:00:00+03:00", endAt: "2027-01-27T10:00:00+03:00", room: "B", category: { id: "talk", label: { en: "Talk", ar: "محاضرة" } }, topic: "", speakerSlugs: [], objectives: [], recordingSlug: null, ...overrides });
describe("PRG-01 schedule", () => {
  it("groups parallel rooms and orders slots chronologically despite editorial ordering", () => {
    const rows = [session("later", { startAt: "2027-01-27T11:00:00+03:00", sortOrder: 0 }), session("b", { sortOrder: 1 }), session("a", { room: "A", sortOrder: 99 }), session("draft", { publication: "draft" })];
    expect(groupProgramSlots(rows).map((slot) => slot.sessions.map((item) => item.slug))).toEqual([["a", "b"], ["later"]]);
    expect(groupProgramSlots([session("next", { day: "day2" }), session("first")])).toHaveLength(2);
  });
  it("combines day, category and room and excludes drafts", () => {
    const rows = [session("yes"), session("draft", { publication: "draft" }), session("room", { room: "A" }), session("type", { category: { id: "panel", label: { en: "Panel", ar: "جلسة" } } }), session("day", { day: "day2" })];
    expect(filterSessions(rows, { day: "day1", category: "talk", room: "B", query: "" }).map((row) => row.slug)).toEqual(["yes"]);
    expect(filterSessions(rows, { day: "all", category: "absent", room: "all", query: "" })).toEqual([]);
  });
  it("formats midnight, offset conversion, and Arabic deterministically", () => {
    expect(formatProgramTime("2027-01-26T21:00:00Z", "en")).toBe("00:00");
    expect(formatProgramTime("2027-01-27T06:15:00Z", "ar")).toBe("٠٩:١٥");
    expect(formatProgramTime("2027-01-27T09:15:00+03:00", "en")).toBe("09:15");
    for (const value of [null, "invalid", "2027-01-27T09:15:00"]) expect(formatProgramTime(value, "en")).toBeNull();
  });
  const fields = { ...emptyContentFields(), day: "2027-01-27", startTime: "09:00", endTime: "10:00", roomEn: " Room A " };
  it("warns for overlaps including containment but allows touching boundaries and other days/rooms", () => {
    expect(sessionsOverlap(fields, { ...fields, roomEn: "room a", startTime: "09:15", endTime: "09:45" })).toBe(true);
    expect(sessionsOverlap(fields, { ...fields, startTime: "10:00", endTime: "11:00" })).toBe(false);
    expect(sessionsOverlap(fields, { ...fields, day: "2027-01-28" })).toBe(false);
    expect(sessionsOverlap(fields, { ...fields, roomEn: "B" })).toBe(false);
    expect(sessionsOverlap({ ...fields, roomEn: "", roomAr: "قاعة" }, { ...fields, roomEn: "", roomAr: "قاعة" })).toBe(true);
    expect(sessionsOverlap({ ...fields, roomEn: "" }, { ...fields, roomEn: "" })).toBe(false);
  });
  it("rejects equal or reversed clocks while allowing incomplete drafts", () => {
    expect(invalidSessionRange({ ...fields, endTime: "09:00" })).toBe(true);
    expect(invalidSessionRange({ ...fields, endTime: "08:00" })).toBe(true);
    expect(invalidSessionRange({ ...fields, endTime: "" })).toBe(false);
  });
});
