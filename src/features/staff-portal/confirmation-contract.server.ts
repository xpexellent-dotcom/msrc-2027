import "server-only";
import type { StaffConfirmationPreview, StaffSeatConfirmation } from "./ui-contract";

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: string[]) => Object.keys(row).sort().join(",") === keys.sort().join(",");
const timestamp = (value: unknown) => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));

export function confirmationPreviewProjection(value: unknown): StaffConfirmationPreview | null {
  const row = record(value);
  if (!row || !exact(row, ["eligibleCount", "opensAt", "settingsReady", "canStart", "previewToken", "responseHours"])
    || !Number.isSafeInteger(row.eligibleCount) || Number(row.eligibleCount) < 0
    || typeof row.settingsReady !== "boolean" || typeof row.canStart !== "boolean"
    || row.opensAt !== null && !timestamp(row.opensAt)
    || row.responseHours !== null && (!Number.isSafeInteger(row.responseHours) || Number(row.responseHours) < 1)
    || row.previewToken !== null && (typeof row.previewToken !== "string" || !/^[a-f0-9]{64}$/.test(row.previewToken))
    || row.settingsReady && (row.opensAt === null || row.responseHours === null || row.previewToken === null)
    || row.canStart && (!row.settingsReady || Number(row.eligibleCount) < 1)) return null;
  return row as StaffConfirmationPreview;
}

export function seatConfirmationProjection(value: unknown, status: string): StaffSeatConfirmation | null {
  const row = record(value);
  if (!row || !exact(row, ["state", "deadline"]) || !timestamp(row.deadline)
    || !["awaiting", "confirmed", "released", "kept"].includes(String(row.state))) return null;
  if (row.state === "confirmed" ? status !== "confirmed" : row.state === "released" ? status !== "cancelled" : status !== "approved") return null;
  return row as StaffSeatConfirmation;
}
