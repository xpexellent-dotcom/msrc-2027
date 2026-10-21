/** Calendar dates stay date-only; parsing never uses the device timezone. */
export function validConferenceDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validConferenceDays(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 31
    && value.every((day, index) => validConferenceDay(day) && (index === 0 || day > value[index - 1]));
}

/** Blank means unconfigured. Duplicates and invalid dates need an owner correction. */
export function parseConferenceDays(value: string): string[] | null | undefined {
  if (!value.trim()) return null;
  const days = value.split(/[,\n]/).map((day) => day.trim()).sort();
  return validConferenceDays(days) ? days : undefined;
}
