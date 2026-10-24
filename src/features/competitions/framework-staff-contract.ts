import { integer, record, text, uuid, type HackathonEligibilityProfile, type HackathonFrameworkStatus, type HackathonTrackSettings } from "./staff-contract";

/** Administrative disclosure is never copied into scientific review packets. */
export function decodeAdministrativeDeclarations(value: unknown): import("./contracts").HackathonDocument["declarations"] | null {
  const row = record(value);
  if (!row) return null;
  const booleanKeys = ["previouslyPresented", "competitionEntered", "prizeReceived", "fundingReceived", "commercialized", "aiUsed", "originalityPermissions", "rulesAcknowledged", "ethicsApplicable", "mediaNoticeAcknowledged", "authorityConfirmed"] as const;
  if (booleanKeys.some((key) => typeof row[key] !== "boolean") || !text(row.historyDetails, 5000) || !text(row.aiTools, 3000) || !text(row.teamContributions, 5000)) return null;
  return { ...Object.fromEntries(booleanKeys.map((key) => [key, row[key]])), historyDetails: row.historyDetails, aiTools: row.aiTools, teamContributions: row.teamContributions } as import("./contracts").HackathonDocument["declarations"];
}

/** Identity records never enter the scientific/reviewer response decoder. */
export function decodeEligibilityProfile(value: unknown): HackathonEligibilityProfile | null {
  const row = record(value);
  if (!row || !text(row.university, 500) || !text(row.fieldOfStudy, 500) || !text(row.phone, 100) || typeof row.enrolledInSaudiUniversity !== "boolean" || typeof row.complete !== "boolean" || row.proofFileId !== null && !uuid(row.proofFileId) || row.proofState !== null && !text(row.proofState, 100)) return null;
  return { university: row.university, fieldOfStudy: row.fieldOfStudy, phone: row.phone, enrolledInSaudiUniversity: row.enrolledInSaudiUniversity, complete: row.complete, proofFileId: row.proofFileId as string | null, proofState: row.proofState as string | null };
}

export function decodeFrameworkStatus(value: unknown): HackathonFrameworkStatus | null {
  const row = record(value);
  if (!row || typeof row.integrityFlag !== "boolean" || typeof row.committeeCleared !== "boolean" || typeof row.thirdReviewRequired !== "boolean" || typeof row.finalistConfirmed !== "boolean" || row.screeningAverage !== null && (typeof row.screeningAverage !== "number" || !Number.isFinite(row.screeningAverage) || row.screeningAverage < 0) || row.reserveRank !== null && !integer(row.reserveRank, 1)) return null;
  return { integrityFlag: row.integrityFlag, committeeCleared: row.committeeCleared, thirdReviewRequired: row.thirdReviewRequired, finalistConfirmed: row.finalistConfirmed, screeningAverage: row.screeningAverage as number | null, reserveRank: row.reserveRank as number | null };
}

export function decodeTrackSettings(value: unknown): HackathonTrackSettings | null {
  const row = record(value);
  if (!row || Object.keys(row).sort().join(",") !== "advancing_research,translating_research") return null;
  const out = {} as HackathonTrackSettings;
  for (const key of ["translating_research", "advancing_research"] as const) {
    const item = record(row[key]);
    if (!item || Object.keys(item).sort().join(",") !== "ar,en" || !text(item.en, 4000) || !item.en.trim() || !text(item.ar, 4000) || !item.ar.trim()) return null;
    out[key] = { en: item.en, ar: item.ar };
  }
  return out;
}

export function whatsappGroupUrl(value: unknown): value is string {
  if (!text(value, 2000)) return false;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "chat.whatsapp.com" && !url.username && !url.password && !url.port && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) && !url.search && !url.hash; } catch { return false; }
}
