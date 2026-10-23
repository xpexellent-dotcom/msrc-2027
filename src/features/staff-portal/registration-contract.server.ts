import "server-only";
import { seatConfirmationProjection } from "./confirmation-contract.server";
import type { Role } from "@/lib/permissions/contract";
import type { NativeStaffSession } from "./backend.server";
import { staffUuid } from "./security.server";
import type { StaffArea, StaffEarlyAccessEntry, StaffParticipant, StaffPriorityRow, StaffRegistrationCounts, StaffRegistrationDetail, StaffRegistrationRequest, StaffResponse, StaffSummary } from "./ui-contract";
import { validStaffEarlyAccessEmail, validStaffRegistrationStatus } from "./validation.server";

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: readonly string[]) => Object.keys(row).sort().join(",") === [...keys].sort().join(",");
const text = (value: unknown, max: number) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
const uuid = (value: unknown) => typeof value === "string" && staffUuid.test(value);
const timestamp = (value: unknown) => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const masked = (value: unknown) => value === null || typeof value === "string" && /^•{6}(?:[\p{L}\p{N}]{4})?$/u.test(value);

export function canReadStaffArea(roles: readonly Role[], area: StaffArea): boolean {
  if (area === "summary") return roles.some((role) => role !== "participant");
  if (area === "early-access" || area === "launch-readiness" || area === "registration-confirmation-preview") return roles.includes("superAdmin");
  if (roles.includes("superAdmin")) return true;
  if (area === "check-in") return roles.includes("checkInStaff");
  return ["registration", "registration-detail", "participants"].includes(area) && roles.includes("registrationWorkshopAdministrator");
}

export function earlyAccessProjection(value: unknown): NonNullable<StaffResponse["earlyAccess"]> | null {
  const data = record(value);
  if (!data || !exact(data, ["entries"]) || !Array.isArray(data.entries) || data.entries.length > 200) return null;
  const entries: StaffEarlyAccessEntry[] = [], ids = new Set<string>();
  let previousTime = Infinity;
  for (const value of data.entries) {
    const row = record(value);
    if (!row || !exact(row, ["id", "email", "addedAt", "addedByName", "hasAccount", "hasRequest"])
      || !uuid(row.id) || typeof row.email !== "string" || !validStaffEarlyAccessEmail(row.email)
      || row.email !== row.email.replace(/^ +| +$/g, "")
      || !timestamp(row.addedAt) || row.addedByName !== null && !text(row.addedByName, 200)
      || typeof row.hasAccount !== "boolean" || typeof row.hasRequest !== "boolean" || row.hasRequest && !row.hasAccount) return null;
    const time = Date.parse(row.addedAt as string), id = (row.id as string).toLowerCase();
    if (time > previousTime || ids.has(id)) return null;
    previousTime = time; ids.add(id); entries.push(row as StaffEarlyAccessEntry);
  }
  return { entries };
}

/** Bound counts and reject invalid-address replies unrelated to this private request. */
export function earlyAccessAddResult(value: unknown, emails: readonly string[]): { added: number; invalid: string[] } | null {
  const row = record(value);
  if (!row || !exact(row, ["state", "added", "invalid"]) || row.state !== "updated" || !count(row.added)
    || !Array.isArray(row.invalid) || row.invalid.length > emails.length) return null;
  // The database is the final server-side email validator. Its Unicode locale
  // need not match JavaScript's case/space rules. Bind each invalid original to
  // its ordered input occurrence instead of reinterpreting the database result.
  const remaining = [...emails], invalid: string[] = [];
  let cursor = 0;
  for (const email of row.invalid) {
    if (typeof email !== "string") return null;
    const index = remaining.indexOf(email, cursor);
    if (index < 0) return null;
    remaining.splice(index, 1); cursor = index; invalid.push(email);
  }
  if (row.added > new Set(remaining).size) return null;
  return { added: row.added, invalid };
}

export function earlyAccessRemoveResult(value: unknown, entryIds: readonly string[]): { removed: number } | null {
  const row = record(value);
  if (!row || !exact(row, ["state", "removed"]) || row.state !== "updated" || !count(row.removed)
    || row.removed > new Set(entryIds.map((id) => id.toLowerCase())).size) return null;
  return { removed: row.removed };
}

export function registrationCounts(value: unknown): StaffRegistrationCounts | null {
  const source = record(value);
  if (!source) return null;
  // Existing hosted reads may precede the offers migration. Normalize only the
  // newly added fields; malformed values and unknown fields still fail closed.
  const row: Record<string, unknown> = { offered: 0, expired: 0, ...source };
  if (!exact(row, ["pending", "approved", "waitlisted", "offered", "expired", "capacity", "remaining", ...["confirmationAwaiting", "confirmationConfirmed", "confirmationReleased"].filter((key) => Object.hasOwn(row, key))])
    || ["confirmationAwaiting", "confirmationConfirmed", "confirmationReleased"].some((key) => Object.hasOwn(row, key) && !count(row[key]))
    || !count(row.pending) || !count(row.approved) || !count(row.waitlisted)
    || !count(row.offered) || !count(row.expired) || row.offered > row.approved
    || row.capacity !== null && !count(row.capacity) || row.remaining !== null && !count(row.remaining)
    || (row.capacity === null) !== (row.remaining === null)
    || typeof row.remaining === "number" && typeof row.capacity === "number" && row.remaining > row.capacity) return null;
  return row as StaffRegistrationCounts;
}

function registrationRequest(value: unknown): StaffRegistrationRequest | null {
  const source = record(value);
  if (!source) return null;
  const row: Record<string, unknown> = { offerExpiresAt: null, ticketStatus: null, ...source };
  if (!exact(row, ["id", "actorId", "name", "email", "status", "priority", "createdAt", "decidedAt", "offerExpiresAt", "identityMasked", "ticketStatus", ...(Object.hasOwn(row, "confirmation") ? ["confirmation"] : [])])
    || !uuid(row.id) || !uuid(row.actorId) || !text(row.name, 200) || !text(row.email, 254)
    || !validStaffRegistrationStatus(row.status) || row.status === "all" || typeof row.priority !== "boolean"
    || !timestamp(row.createdAt) || row.decidedAt !== null && !timestamp(row.decidedAt)
    || row.offerExpiresAt !== null && !timestamp(row.offerExpiresAt) || !masked(row.identityMasked)
    || row.ticketStatus !== null && row.ticketStatus !== "issued" && row.ticketStatus !== "revoked") return null;
  if (Object.hasOwn(row, "confirmation") && row.confirmation !== null && !seatConfirmationProjection(row.confirmation, String(row.status))) return null;
  return row as StaffRegistrationRequest;
}

export function registrationProjection(value: unknown): NonNullable<StaffResponse["registration"]> | null {
  const data = record(value);
  if (!data || !exact(data, ["requests", "counts"]) || !Array.isArray(data.requests) || data.requests.length > 50) return null;
  const counts = registrationCounts(data.counts);
  if (!counts) return null;
  const requests: StaffRegistrationRequest[] = [];
  for (const value of data.requests) {
    const row = registrationRequest(value);
    if (!row) return null;
    requests.push(row);
  }
  return { requests, counts };
}

export function registrationDetailProjection(value: unknown, requestId: string): StaffRegistrationDetail | null {
  const data = record(value);
  if (!data || !exact(data, ["request", "history"]) || !Array.isArray(data.history)) return null;
  const request = registrationRequest(data.request);
  if (!request || request.id.toLowerCase() !== requestId.toLowerCase()) return null;
  const history: StaffRegistrationDetail["history"] = [];
  let previousTime = Infinity;
  const ids = new Set<string>();
  for (const value of data.history) {
    const row = record(value);
    if (!row || !exact(row, ["id", "event", "actorKind", "from", "to", "at", "performerName"]) || !uuid(row.id)
      || !["request.submitted", "request.approved", "request.waitlisted", "request.offered", "request.offer_expired",
        "request.offer_accepted", "request.offer_declined", "request.cancelled", "request.confirmation_opened", "request.seat_confirmed", "request.seat_released", "request.confirmation_kept", "ticket.issued", "ticket.revoked"].includes(row.event as string)
      || !["participant", "automatic", "staff"].includes(row.actorKind as string)
      || row.from !== null && (!validStaffRegistrationStatus(row.from) || row.from === "all")
      || row.to !== null && (!validStaffRegistrationStatus(row.to) || row.to === "all") || !timestamp(row.at)
      || row.performerName !== null && !text(row.performerName, 200)
      || row.actorKind !== "staff" && row.performerName !== null) return null;
    const participant = ["request.submitted", "request.offer_accepted", "request.offer_declined", "request.cancelled", "request.seat_confirmed"].includes(row.event as string);
    const automatic = ["request.offer_expired", "request.confirmation_kept", "ticket.issued", "ticket.revoked"].includes(row.event as string);
    if (participant && row.actorKind !== "participant" || automatic && row.actorKind !== "automatic"
      || ["request.approved", "request.waitlisted"].includes(row.event as string) && row.actorKind !== "staff"
      || ["request.offered", "request.confirmation_opened"].includes(row.event as string) && row.actorKind === "participant"
      || row.event === "request.seat_released" && row.actorKind === "staff") return null;
    // Submission and ticket audit records carry no request-state transition.
    const noTransition = ["request.submitted", "ticket.issued", "ticket.revoked"].includes(row.event as string);
    if (noTransition ? row.from !== null || row.to !== null : row.from === null || row.to === null) return null;
    const transitions: Record<string, [readonly string[], readonly string[]]> = {
      "request.approved": [["pending_approval", "waitlisted"], ["approved", "approved_awaiting_payment"]],
      "request.waitlisted": [["pending_approval"], ["waitlisted"]], "request.offered": [["waitlisted"], ["offered"]],
      "request.offer_expired": [["offered"], ["expired"]], "request.offer_accepted": [["offered"], ["approved"]],
      "request.offer_declined": [["offered"], ["cancelled"]],
      "request.cancelled": [["pending_approval", "waitlisted", "offered", "approved"], ["cancelled"]],
      "request.confirmation_opened": [["approved"], ["approved"]], "request.seat_confirmed": [["approved"], ["confirmed"]],
      "request.seat_released": [["approved", "confirmed"], ["cancelled"]], "request.confirmation_kept": [["approved"], ["approved"]],
    };
    const transition = transitions[row.event as string];
    if (transition && (!transition[0].includes(row.from as string) || !transition[1].includes(row.to as string))) return null;
    const time = Date.parse(row.at as string), id = (row.id as string).toLowerCase();
    if (time > previousTime || ids.has(id)) return null;
    previousTime = time; ids.add(id);
    history.push(row as StaffRegistrationDetail["history"][number]);
  }
  return { request, history };
}

type RegistrationExportRow = Pick<StaffRegistrationRequest, "name" | "email" | "status" | "priority" | "createdAt" | "decidedAt" | "identityMasked">;
const exportColumns = ["name", "email", "status", "priority", "createdAt", "decidedAt", "identityMasked"] as const;

/** Quotes every cell and neutralizes formulas before applying CSV escaping. */
function csvCell(value: string | boolean | null): string {
  const cell = value === null ? "" : String(value);
  return '"' + (/^[=+\-@\t\r]/.test(cell) ? "'" : "") + cell.replaceAll('"', '""') + '"';
}

export function registrationExportCsv(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const rows: string[] = [exportColumns.map(csvCell).join(",")];
  for (const item of value) {
    const row = record(item);
    // Tabs and line breaks are valid quoted CSV content; all other controls are
    // rejected. Identity must always match the masked form, even for Super Admin.
    const csvText = (value: unknown, max: number) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
    if (!row || !exact(row, exportColumns) || !csvText(row.name, 200) || !csvText(row.email, 254)
      || !validStaffRegistrationStatus(row.status) || row.status === "all" || typeof row.priority !== "boolean"
      || !timestamp(row.createdAt) || row.decidedAt !== null && !timestamp(row.decidedAt) || !masked(row.identityMasked)) return null;
    const typed = row as RegistrationExportRow;
    rows.push(exportColumns.map((column) => csvCell(typed[column])).join(","));
  }
  return "\uFEFF" + rows.join("\r\n") + "\r\n";
}

export function registrationDecision(value: unknown, requested: number, action: "registration-approve" | "registration-waitlist" | "registration-offer"): NonNullable<StaffResponse["decided"]> | null {
  const row = record(value);
  if (!row || !exact(row, ["approved", "waitlisted", "skipped", ...(action === "registration-offer" || Object.hasOwn(row, "offered") ? ["offered"] : [])])
    || !count(row.approved) || !count(row.waitlisted) || !count(row.skipped)
    || Object.hasOwn(row, "offered") && !count(row.offered)
    || action === "registration-offer" && (!count(row.offered) || row.approved !== 0 || row.waitlisted !== 0)
    || action !== "registration-offer" && (row.offered ?? 0) !== 0
    || row.approved + row.waitlisted + row.skipped + Number(row.offered ?? 0) !== requested
    || (action === "registration-approve" ? row.waitlisted !== 0 : row.approved !== 0)) return null;
  return row as NonNullable<StaffResponse["decided"]>;
}

export function priorityProjection(value: unknown): NonNullable<StaffResponse["priority"]> | null {
  const data = record(value);
  if (!data || Object.keys(data).some((key) => !["designations", "candidates"].includes(key))
    || !Array.isArray(data.designations) || data.designations.length > 50) return null;
  const designations: StaffPriorityRow[] = [];
  for (const value of data.designations) {
    const row = record(value);
    if (!row || !exact(row, ["actorId", "name", "email", "active", "reason", "designatedAt", "designatedByName", "removedAt"])
      || !uuid(row.actorId) || !text(row.name, 200) || !text(row.email, 254) || typeof row.active !== "boolean"
      || !text(row.reason, 300) || !timestamp(row.designatedAt) || row.designatedByName !== null && !text(row.designatedByName, 200)
      || row.removedAt !== null && !timestamp(row.removedAt)) return null;
    designations.push(row as StaffPriorityRow);
  }
  if (!Object.hasOwn(data, "candidates")) return { designations };
  if (!Array.isArray(data.candidates) || data.candidates.length > 50) return null;
  const candidates: StaffParticipant[] = [];
  for (const value of data.candidates) {
    const row = record(value);
    if (!row || !exact(row, ["actorId", "name", "email", "status", "createdAt", ...(Object.hasOwn(row, "identityMasked") ? ["identityMasked"] : [])])
      || !uuid(row.actorId) || !text(row.name, 200) || !text(row.email, 254) || !["unverified", "verified", "suspended"].includes(row.status as string)
      || !timestamp(row.createdAt) || Object.hasOwn(row, "identityMasked") && !masked(row.identityMasked)) return null;
    candidates.push(row as StaffParticipant);
  }
  return { designations, candidates };
}

/** Apply the current server-verified role scope even if a transport over-returns. */
export function summaryProjection(value: unknown, roles: readonly Role[]): StaffSummary | null {
  const row = record(value);
  if (!row || Object.keys(row).some((key) => !["registration", "participants", "staff", "auditLast24h", "priority"].includes(key))) return null;
  const summary: StaffSummary = {};
  if (canReadStaffArea(roles, "registration") && Object.hasOwn(row, "registration")) {
    const registration = registrationCounts(row.registration); if (!registration) return null;
    summary.registration = registration;
  }
  for (const key of ["participants", "staff", "auditLast24h", "priority"] as const) {
    if (!Object.hasOwn(row, key) || !canReadStaffArea(roles, key === "staff" ? "people" : key === "auditLast24h" ? "audit" : key)) continue;
    if (!count(row[key])) return null;
    summary[key] = row[key];
  }
  return summary;
}

/** Decode only after native identity and exact-session policy verification. */
export function verifiedStaffRegistrationClaims(session: NativeStaffSession, now: number): Record<string, unknown> | null {
  try {
    const value = record(JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url").toString("utf8")));
    if (!value || value.sub !== session.actorId || value.session_id !== session.sessionId || value.role !== "authenticated" || !["aal1", "aal2"].includes(String(value.aal))
      || !Number.isSafeInteger(value.exp) || Number(value.exp) * 1000 <= now || !Array.isArray(value.amr)) return null;
    const amr = value.amr.map((entry) => {
      const item = record(entry);
      return item && typeof item.method === "string" && /^[a-z_]{1,40}$/.test(item.method) && Number.isSafeInteger(item.timestamp)
        && Number(item.timestamp) >= 0 && Number(item.timestamp) * 1000 <= now ? { method: item.method, timestamp: item.timestamp } : null;
    });
    if (amr.some((entry) => entry === null) || !amr.some((entry) => entry?.method === "password")
      || value.aal === "aal2" && !amr.some((entry) => entry?.method === "totp")) return null;
    if (value.iat !== undefined && (!Number.isSafeInteger(value.iat) || Number(value.iat) < 0 || Number(value.iat) * 1000 > now)) return null;
    // Neither user/app metadata nor JWT role-name arrays are authority evidence.
    return { sub: value.sub, session_id: value.session_id, role: value.role, aal: value.aal, amr, exp: value.exp,
      ...(value.iat !== undefined ? { iat: value.iat } : {}) };
  } catch { return null; }
}

export function verifiedPriorityClaims(session: NativeStaffSession, now: number): Record<string, unknown> | null {
  const claims = verifiedStaffRegistrationClaims(session, now);
  return claims?.aal === "aal2" ? claims : null;
}
