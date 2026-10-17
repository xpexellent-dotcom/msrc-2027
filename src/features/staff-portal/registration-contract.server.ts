import "server-only";
import type { Role } from "@/lib/permissions/contract";
import type { NativeStaffSession } from "./backend.server";
import { staffUuid } from "./security.server";
import type { StaffArea, StaffParticipant, StaffPriorityRow, StaffRegistrationCounts, StaffRegistrationRequest, StaffResponse, StaffSummary } from "./ui-contract";
import { validStaffRegistrationStatus } from "./validation.server";

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: readonly string[]) => Object.keys(row).sort().join(",") === [...keys].sort().join(",");
const text = (value: unknown, max: number) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
const uuid = (value: unknown) => typeof value === "string" && staffUuid.test(value);
const timestamp = (value: unknown) => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const masked = (value: unknown) => value === null || typeof value === "string" && /^•{6}(?:[\p{L}\p{N}]{4})?$/u.test(value);

export function canReadStaffArea(roles: readonly Role[], area: StaffArea): boolean {
  if (area === "summary") return roles.some((role) => role !== "participant");
  if (roles.includes("superAdmin")) return true;
  return ["registration", "participants"].includes(area) && roles.includes("registrationWorkshopAdministrator");
}

export function registrationCounts(value: unknown): StaffRegistrationCounts | null {
  const row = record(value);
  if (!row || !exact(row, ["pending", "approved", "waitlisted", "capacity", "remaining"])
    || !count(row.pending) || !count(row.approved) || !count(row.waitlisted)
    || row.capacity !== null && !count(row.capacity) || row.remaining !== null && !count(row.remaining)
    || (row.capacity === null) !== (row.remaining === null)
    || typeof row.remaining === "number" && typeof row.capacity === "number" && row.remaining > row.capacity) return null;
  return row as StaffRegistrationCounts;
}

export function registrationProjection(value: unknown): NonNullable<StaffResponse["registration"]> | null {
  const data = record(value);
  if (!data || !exact(data, ["requests", "counts"]) || !Array.isArray(data.requests) || data.requests.length > 50) return null;
  const counts = registrationCounts(data.counts);
  if (!counts) return null;
  const requests: StaffRegistrationRequest[] = [];
  for (const value of data.requests) {
    const row = record(value);
    if (!row || !exact(row, ["id", "actorId", "name", "email", "status", "priority", "createdAt", "decidedAt", "identityMasked"])
      || !uuid(row.id) || !uuid(row.actorId) || !text(row.name, 200) || !text(row.email, 254)
      || !validStaffRegistrationStatus(row.status) || row.status === "all" || typeof row.priority !== "boolean"
      || !timestamp(row.createdAt) || row.decidedAt !== null && !timestamp(row.decidedAt) || !masked(row.identityMasked)) return null;
    requests.push(row as StaffRegistrationRequest);
  }
  return { requests, counts };
}

export function registrationDecision(value: unknown, requested: number, action: "registration-approve" | "registration-waitlist"): NonNullable<StaffResponse["decided"]> | null {
  const row = record(value);
  if (!row || !exact(row, ["approved", "waitlisted", "skipped"]) || !count(row.approved) || !count(row.waitlisted) || !count(row.skipped)
    || row.approved + row.waitlisted + row.skipped !== requested
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
export function verifiedPriorityClaims(session: NativeStaffSession, now: number): Record<string, unknown> | null {
  try {
    const value = record(JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url").toString("utf8")));
    if (!value || value.sub !== session.actorId || value.session_id !== session.sessionId || value.role !== "authenticated" || value.aal !== "aal2"
      || !Number.isSafeInteger(value.exp) || Number(value.exp) * 1000 <= now || !Array.isArray(value.amr)) return null;
    const amr = value.amr.map((entry) => {
      const item = record(entry);
      return item && typeof item.method === "string" && /^[a-z_]{1,40}$/.test(item.method) && Number.isSafeInteger(item.timestamp)
        && Number(item.timestamp) >= 0 && Number(item.timestamp) * 1000 <= now ? { method: item.method, timestamp: item.timestamp } : null;
    });
    if (amr.some((entry) => entry === null) || !amr.some((entry) => entry?.method === "password") || !amr.some((entry) => entry?.method === "totp")) return null;
    if (value.iat !== undefined && (!Number.isSafeInteger(value.iat) || Number(value.iat) < 0 || Number(value.iat) * 1000 > now)) return null;
    // Neither user/app metadata nor JWT role-name arrays are authority evidence.
    return { sub: value.sub, session_id: value.session_id, role: value.role, aal: value.aal, amr, exp: value.exp,
      ...(value.iat !== undefined ? { iat: value.iat } : {}) };
  } catch { return null; }
}
