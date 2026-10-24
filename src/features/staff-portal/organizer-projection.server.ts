import "server-only";
import type { Role } from "@/lib/permissions/contract";
import { csvDocument, type CsvValue } from "@/lib/csv";

export const organizerModules = ["registrations", "accounts", "orders", "submissions", "reviews", "accepted", "workshops", "attendance", "certificates", "announcements", "hackathon", "three_minute_thesis", "email_failures"] as const;
const moduleRoles: Record<string, readonly Role[]> = {
  registrations: ["registrationWorkshopAdministrator"], accounts: [], orders: ["finance"],
  submissions: ["scientificAdministrator"], reviews: ["scientificAdministrator", "abstractReviewer", "hackathonReviewer", "threeMinuteThesisReviewer", "facultyJudge"],
  accepted: ["scientificAdministrator", "judgingCommittee"], workshops: ["registrationWorkshopAdministrator", "checkInStaff"],
  attendance: ["registrationWorkshopAdministrator", "checkInStaff"], certificates: ["registrationWorkshopAdministrator"],
  announcements: [], hackathon: ["scientificAdministrator", "judgingCommittee"], three_minute_thesis: ["scientificAdministrator", "judgingCommittee"], email_failures: [],
};
export const organizerRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const organizerText = (value: unknown, max = 160): value is string => typeof value === "string" && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
const exact = (row: Record<string, unknown>, keys: readonly string[]) => Object.keys(row).sort().join(",") === [...keys].sort().join(",");
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const timestamp = (value: unknown): value is string => organizerText(value, 64) && Number.isFinite(Date.parse(value));

/** Navigation/transport defense only: the RPC independently checks live edition/assignment scope. */
export function canReadOrganizerModule(roles: readonly Role[], module: string): boolean {
  return Object.hasOwn(moduleRoles, module) && (roles.includes("superAdmin") || moduleRoles[module].some((role) => roles.includes(role)));
}

export function dashboardProjection(value: unknown, roles: readonly Role[]) {
  const row = organizerRecord(value);
  if (!row || !exact(row, ["cells", "modules", "suppressionThreshold"]) || row.suppressionThreshold !== 5 || !Array.isArray(row.modules)
    || row.modules.length > organizerModules.length || !row.modules.every((entry) => organizerText(entry) && organizerModules.includes(entry as typeof organizerModules[number]))
    || new Set(row.modules).size !== row.modules.length || !Array.isArray(row.cells) || row.cells.length > 20000) return null;
  const modules = row.modules.filter((module) => canReadOrganizerModule(roles, module));
  const cells: { module: string; dimension: string; value: string; count: number | null }[] = [], seen = new Set<string>(), suppressed = new Set<string>();
  for (const entry of row.cells) {
    const cell = organizerRecord(entry);
    if (!cell || !exact(cell, ["module", "dimension", "value", "count"]) || !organizerText(cell.module) || !organizerText(cell.dimension, 200)
      || !cell.dimension || !organizerText(cell.value, 300) || !cell.value || cell.count !== null && !count(cell.count) || !row.modules.includes(cell.module)) return null;
    const key = JSON.stringify([cell.module, cell.dimension, cell.value]); if (seen.has(key)) return null; seen.add(key);
    if (!modules.includes(cell.module)) continue;
    const typed = cell as typeof cells[number];
    if (!roles.includes("superAdmin") && (typed.count === null || typed.count < 5)) suppressed.add(JSON.stringify([typed.module, typed.dimension]));
    cells.push({ module: typed.module, dimension: typed.dimension, value: typed.value, count: typed.count });
  }
  return { cells: cells.map((cell) => ({ ...cell, count: suppressed.has(JSON.stringify([cell.module, cell.dimension])) ? null : cell.count })), modules, suppressionThreshold: 5 as const };
}

export function participantMatches(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) return null;
  const matches = [];
  for (const entry of value) {
    const row = organizerRecord(entry);
    if (!row || !exact(row, ["actorId", "name", "email", "records"]) || !uuid(row.actorId) || !organizerText(row.name, 200)
      || !organizerText(row.email, 254) || !Array.isArray(row.records) || row.records.length > 1000) return null;
    const records = [];
    for (const raw of row.records) {
      const item = organizerRecord(raw);
      if (!item || !exact(item, ["module", "reference", "status"]) || !organizerText(item.module) || !organizerModules.includes(item.module as typeof organizerModules[number])
        || !organizerText(item.reference, 200) || !organizerText(item.status, 100)) return null;
      records.push({ module: item.module, reference: item.reference, status: item.status });
    }
    matches.push({ actorId: row.actorId, name: row.name, email: row.email, records });
  }
  return matches;
}

function safeAuditDetails(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value === "string") return value.length <= 20000 && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
  if (Array.isArray(value)) return value.length <= 100 && value.every((entry) => safeAuditDetails(entry, depth + 1));
  const row = organizerRecord(value);
  return !!row && Object.keys(row).length <= 100 && Object.entries(row).every(([key, entry]) => organizerText(key, 200) && safeAuditDetails(entry, depth + 1));
}

export function auditTimeline(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) return null;
  const events = [];
  for (const entry of value) {
    const row = organizerRecord(entry);
    if (!row || !exact(row, ["id", "module", "actorId", "targetId", "action", "result", "at", "details"]) || !organizerText(row.id, 250)
      || !organizerText(row.module, 100) || row.actorId !== null && !uuid(row.actorId) || row.targetId !== null && !organizerText(row.targetId, 250)
      || !organizerText(row.action, 200) || !organizerText(row.result, 100) || !timestamp(row.at) || !organizerRecord(row.details) || !safeAuditDetails(row.details)) return null;
    events.push({ id: row.id, module: row.module, actorId: row.actorId as string | null, targetId: row.targetId as string | null,
      action: row.action, result: row.result, at: row.at, details: row.details });
  }
  return events;
}

/** Fixed column allowlist blocks accidental expansion into manuscripts, IDs, secrets or answers. */
export function organizerExport(value: unknown, kind: string, roles: readonly Role[], module = "all"): string | null {
  if (!["aggregate", "operational", "personal"].includes(kind) || kind === "personal" && !roles.includes("superAdmin")) return null;
  const data = organizerRecord(value), columns = kind === "aggregate" ? ["module", "dimension", "value", "count"]
    : kind === "operational" ? ["module", "reference", "status"] : ["module", "reference", "status", "actorId", "name", "email"];
  if (!data || !Array.isArray(data.columns) || data.columns.join(",") !== columns.join(",") || !Array.isArray(data.rows) || data.rows.length > 100000) return null;
  const rows: CsvValue[][] = [], suppressed = new Set<string>();
  for (const entry of data.rows) {
    if (!Array.isArray(entry) || entry.length !== columns.length || !entry.every((cell) => cell === null || typeof cell === "boolean" || typeof cell === "number" && Number.isFinite(cell)
      || typeof cell === "string" && cell.length <= 2000 && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(cell))
      || typeof entry[0] !== "string" || !canReadOrganizerModule(roles, entry[0]) || module !== "all" && entry[0] !== module) return null;
    if (kind === "aggregate") {
      if (!organizerText(entry[1], 200) || !organizerText(entry[2], 300) || entry[3] !== null && !count(entry[3])) return null;
      if (!roles.includes("superAdmin") && (entry[3] === null || entry[3] < 5)) suppressed.add(JSON.stringify([entry[0], entry[1]]));
    } else {
      if (!organizerText(entry[1], 200) || !organizerText(entry[2], 100)
        || kind === "personal" && (entry[3] !== null && !uuid(entry[3]) || entry[4] !== null && !organizerText(entry[4], 200) || entry[5] !== null && !organizerText(entry[5], 254))) return null;
    }
    rows.push([...entry]);
  }
  return csvDocument(columns, rows.map((row) => kind === "aggregate" && suppressed.has(JSON.stringify([row[0], row[1]])) ? [...row.slice(0, 3), null] : row));
}
