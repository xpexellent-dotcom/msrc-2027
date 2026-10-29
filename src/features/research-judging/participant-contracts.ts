export type WinnerSupervisor = { name: string; affiliation: string; email: string; confirmed: boolean };
export type ResearchParticipantEntry = {
  id: string; title: string; reference: string | null; presentationFormat: "oral" | "poster" | null;
  award: null | { label: string; categoryId: string };
  supervisorRequest: null | { awardId: string; deadline: string; evidence: string; details: WinnerSupervisor | null };
};
export type ResearchParticipantResponse = { state: "ready"; entries: ResearchParticipantEntry[]; formToken: string; outcome?: "saved" | "conflict" | "invalid" | "locked" | "not_found" }
  | { state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" };

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: string[]) => Object.keys(row).sort().join(",") === keys.sort().join(",");
const safeText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function decodeWinnerSupervisor(value: unknown): WinnerSupervisor | null {
  const row = record(value);
  if (!row || !exact(row, ["name", "affiliation", "email", "confirmed"]) || !safeText(row.name, 500) || !row.name.trim()
    || !safeText(row.affiliation, 500) || !row.affiliation.trim() || !safeText(row.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
    || typeof row.confirmed !== "boolean") return null;
  return { name: row.name.trim(), affiliation: row.affiliation.trim(), email: row.email, confirmed: row.confirmed };
}
/** An owner-only projection. Unpublished outcomes and all review/judge records are outside this contract. */
export function projectResearchParticipantEntries(value: unknown): ResearchParticipantEntry[] | null {
  const root = record(value);
  if (!root || !exact(root, ["state", "entries"]) || root.state !== "ready" || !Array.isArray(root.entries) || root.entries.length > 5000) return null;
  const entries: ResearchParticipantEntry[] = [];
  for (const raw of root.entries) {
    const row = record(raw);
    if (!row || !exact(row, ["id", "title", "reference", "presentationFormat", "award", "supervisorRequest"]) || !uuid(row.id)
      || !safeText(row.title, 6000) || row.reference !== null && !safeText(row.reference, 200)
      || ![null, "oral", "poster"].includes(row.presentationFormat as null | string)) return null;
    let award: ResearchParticipantEntry["award"] = null, supervisorRequest: ResearchParticipantEntry["supervisorRequest"] = null;
    if (row.award !== null) {
      const item = record(row.award);
      if (!item || !exact(item, ["label", "categoryId"]) || !safeText(item.label, 500) || !item.label.trim() || !safeText(item.categoryId, 100) || !item.categoryId.trim()) return null;
      award = { label: item.label, categoryId: item.categoryId };
    }
    if (row.supervisorRequest !== null) {
      const item = record(row.supervisorRequest);
      if (!item || !exact(item, ["awardId", "deadline", "evidence", "details"]) || !uuid(item.awardId) || !safeText(item.deadline, 100)
        || !Number.isFinite(Date.parse(item.deadline)) || !safeText(item.evidence, 12000) || !item.evidence.trim()) return null;
      const details = item.details === null ? null : decodeWinnerSupervisor(item.details);
      if (item.details !== null && !details) return null;
      supervisorRequest = { awardId: item.awardId, deadline: item.deadline, evidence: item.evidence, details };
    }
    entries.push({ id: row.id, title: row.title, reference: row.reference as string | null, presentationFormat: row.presentationFormat as ResearchParticipantEntry["presentationFormat"], award, supervisorRequest });
  }
  return new Set(entries.map((row) => row.id)).size === entries.length ? entries : null;
}
