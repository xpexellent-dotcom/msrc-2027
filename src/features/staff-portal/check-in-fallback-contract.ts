/** ENG-082 / CHK-05: outage roster and offline reconciliation. Client-safe helpers only. */
export const OFFLINE_IMPORT_MAX_ROWS = 2000;
export const OFFLINE_OUTCOMES = ["checked_in", "already_checked_in", "previously_undone", "revoked", "not_found", "not_approved", "invalid", "unavailable"] as const;
export type OfflineOutcome = typeof OFFLINE_OUTCOMES[number];
export type OfflineEntry = { reference: string; time: string; recorder: string };
export type OfflineSheet = { state: "ready"; entries: OfflineEntry[] } | { state: "empty" | "too_many" } | { state: "malformed"; line: number };
export type OfflineImportResult = { state: "ready" | "replayed"; day: string; outcomes: OfflineOutcome[]; counts: Partial<Record<OfflineOutcome, number>> };
export type RosterRow = { reference: string; name: string };

const controls = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const latinDigits = (value: string) => value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

/** One CSV or tab-separated line; double quotes may wrap a cell containing the separator. */
function splitLine(line: string, separator: string): string[] | null {
  const cells: string[] = []; let cell = "", quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.trim() === "") { quoted = true; cell = ""; }
    else if (char === separator) { cells.push(cell); cell = ""; }
    else cell += char;
  }
  if (quoted) return null;
  cells.push(cell);
  return cells.map((value) => value.trim());
}

/**
 * Reads pasted or uploaded outage sheets: reference, Riyadh time (HH:MM), staff name or initials.
 * An optional header row is skipped. The server repeats every check; this only gives early feedback.
 */
export function parseOfflineSheet(text: string): OfflineSheet {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\n|\r/);
  const entries: OfflineEntry[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    const cells = splitLine(line, line.includes("\t") ? "\t" : ",");
    if (!cells) return { state: "malformed", line: index + 1 };
    if (!entries.length && /^reference$/i.test(cells[0] ?? "")) continue;
    if (cells.length !== 3) return { state: "malformed", line: index + 1 };
    const reference = latinDigits(cells[0]).toUpperCase(), time = latinDigits(cells[1]), recorder = cells[2];
    if (!/^[A-F0-9]{12}$/.test(reference) || !/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(time)
      || !recorder || recorder.length > 80 || controls.test(recorder) || /[\t\r\n]/.test(recorder)) return { state: "malformed", line: index + 1 };
    entries.push({ reference, time, recorder });
    if (entries.length > OFFLINE_IMPORT_MAX_ROWS) return { state: "too_many" };
  }
  return entries.length ? { state: "ready", entries } : { state: "empty" };
}

/** Quotes every cell and neutralizes spreadsheet formulas. */
export function csvCell(value: string): string {
  return '"' + (/^[=+\-@\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
}
export function rosterCsv(rows: readonly RosterRow[]): string {
  return "﻿" + [["reference", "name"], ...rows.map((row) => [row.reference, row.name])].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function decodeRoster(value: unknown, day: string): RosterRow[] | null {
  const row = record(value);
  if (!row || row.state !== "ready" || row.day !== day || !Array.isArray(row.rows) || Object.keys(row).sort().join() !== "day,rows,state") return null;
  const rows: RosterRow[] = [];
  for (const item of row.rows) {
    const entry = record(item);
    if (!entry || Object.keys(entry).sort().join() !== "name,reference" || typeof entry.reference !== "string" || !/^[A-F0-9]{12}$/.test(entry.reference)
      || typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 200 || controls.test(entry.name)) return null;
    rows.push({ reference: entry.reference, name: entry.name });
  }
  return rows;
}

export function decodeOfflineImport(value: unknown, day: string, expectedRows: number): OfflineImportResult | null {
  const row = record(value), counts = record(row?.counts);
  if (!row || !["ready", "replayed"].includes(String(row.state)) || row.day !== day || !Array.isArray(row.outcomes) || row.outcomes.length !== expectedRows
    || !row.outcomes.every((outcome) => (OFFLINE_OUTCOMES as readonly unknown[]).includes(outcome)) || !counts) return null;
  const outcomes = row.outcomes as OfflineOutcome[], tally: Partial<Record<OfflineOutcome, number>> = {};
  for (const outcome of outcomes) tally[outcome] = (tally[outcome] ?? 0) + 1;
  if (Object.keys(counts).length !== Object.keys(tally).length || Object.entries(counts).some(([key, count]) => tally[key as OfflineOutcome] !== count)) return null;
  return { state: row.state as "ready" | "replayed", day, outcomes, counts: tally };
}
