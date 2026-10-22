import "server-only";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { normalizeParticipantCode } from "@/features/participant-accounts/validation.server";
import { staffUuid } from "./security.server";
import type { StaffRegistrationSettingsChanges, StaffRegistrationStatus } from "./ui-contract";
import { registrationSettingsChanges } from "./registration-settings-validation";
import { checkInDay } from "./check-in-contract.server";

export const STAFF_REGISTRATION_STATUSES = ["pending_approval", "approved", "approved_awaiting_payment", "waitlisted", "offered", "confirmed", "cancelled", "expired"] as const satisfies readonly StaffRegistrationStatus[];
export function validStaffRegistrationStatus(value: unknown): value is StaffRegistrationStatus | "all" {
  return value === "all" || typeof value === "string" && STAFF_REGISTRATION_STATUSES.includes(value as StaffRegistrationStatus);
}

export const STAFF_ACTIONS = ["signin", "logout", "activity", "enroll-totp", "challenge-totp", "verify-totp", "challenge-email", "verify-email",
  "invite-accept", "invite", "invite-resend", "invite-revoke", "roles", "suspend", "reactivate", "revoke-sessions",
  "reset-authenticator", "reset-account", "reveal-identity", "password-change", "registration-approve", "registration-waitlist", "registration-offer", "priority-set", "priority-remove", "early-access-add", "early-access-remove", "registration-settings-save", "check-in", "check-in-undo"] as const;
export interface StaffPayload {
  action: (typeof STAFF_ACTIONS)[number]; formToken: string; email?: string; name?: string; password?: string; passwordConfirmation?: string;
  code?: string; challengeId?: string; factorId?: string; invitationId?: string; token?: string; targetId?: string;
  roles?: Role[]; website?: string; reason?: string; requestIds?: string[]; status?: StaffRegistrationStatus | "all";
  emails?: string[]; entryIds?: string[]; changes?: StaffRegistrationSettingsChanges; operationId?: string;
  ticketTokenOrReference?: string; conferenceDay?: string; entryPoint?: string; attendanceId?: string;
}
/** Validate the private response without rewriting the database's normalized email. */
export function validStaffEarlyAccessEmail(email: string): boolean {
  // SQL applies its own Unicode-aware shape check. This common transport shape
  // deliberately avoids claiming JavaScript and database locale equivalence.
  const length = Array.from(email).length;
  return length >= 3 && length <= 254
    && /^[^\x00-\x20\x7f@<>]+@[^\x00-\x20\x7f@<>]+\.[^\x00-\x20\x7f@<>]+$/.test(email);
}
export function validateStaffPayload(value: unknown): StaffPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!STAFF_ACTIONS.includes(record.action as never) || typeof record.formToken !== "string") return null;
  const allowed = ["action", "formToken", "email", "name", "password", "passwordConfirmation", "code", "challengeId", "factorId", "invitationId", "token", "targetId", "roles", "website", "reason", "requestIds", "status", "emails", "entryIds", "changes", "operationId", "ticketTokenOrReference", "conferenceDay", "entryPoint", "attendanceId"];
  if (Object.keys(record).some((key) => !allowed.includes(key))
    || Object.entries(record).some(([key, entry]) => !["roles", "requestIds", "emails", "entryIds", "changes"].includes(key) && (typeof entry !== "string" || entry.length > (key === "formToken" ? 1024 : 512)))) return null;
  const input = { ...record } as unknown as StaffPayload;
  if (input.action === "check-in") {
    if (Object.keys(record).some((key) => !["action", "formToken", "website", "ticketTokenOrReference", "conferenceDay", "entryPoint"].includes(key))) return null;
    input.ticketTokenOrReference = input.ticketTokenOrReference?.trim(); input.entryPoint = input.entryPoint?.trim();
    if (!input.ticketTokenOrReference || input.ticketTokenOrReference.length > 256 || /[\x00-\x1f\x7f]/.test(input.ticketTokenOrReference)
      || !checkInDay(input.conferenceDay) || input.entryPoint !== undefined && (input.entryPoint.length > 120 || /[\x00-\x1f\x7f]/.test(input.entryPoint))) return null;
  } else if (input.ticketTokenOrReference !== undefined || input.conferenceDay !== undefined || input.entryPoint !== undefined) return null;
  if (input.action === "check-in-undo") {
    if (Object.keys(record).some((key) => !["action", "formToken", "website", "attendanceId", "reason"].includes(key))
      || !input.attendanceId || !staffUuid.test(input.attendanceId)) return null;
  } else if (input.attendanceId !== undefined) return null;
  if (input.action === "registration-settings-save") {
    const changes = registrationSettingsChanges(input.changes);
    if (Object.keys(record).some((key) => !["action", "formToken", "website", "changes", "operationId"].includes(key))
      || !changes || !input.operationId || !staffUuid.test(input.operationId)) return null;
    input.changes = changes; input.operationId = input.operationId.toLowerCase();
  } else if (input.changes !== undefined || input.operationId !== undefined) return null;
  if (input.action === "activity" && Object.keys(record).some((key) => !["action", "formToken", "website"].includes(key))) return null;
  if (["reveal-identity", "priority-set", "priority-remove", "check-in-undo"].includes(input.action)) {
    input.reason = input.reason?.trim();
    if (!input.reason || input.reason.length > 300 || /[\x00-\x1f\x7f]/.test(input.reason)) return null;
  } else if (input.reason !== undefined) return null;
  if (["registration-approve", "registration-waitlist", "registration-offer"].includes(input.action)) {
    if (Object.keys(record).some((key) => !["action", "formToken", "website", "requestIds", "status"].includes(key))
      || !Array.isArray(input.requestIds) || input.requestIds.length < 1 || input.requestIds.length > 100
      || input.requestIds.some((id) => typeof id !== "string" || !staffUuid.test(id))
      || new Set(input.requestIds.map((id) => id.toLowerCase())).size !== input.requestIds.length
      || input.status !== undefined && !validStaffRegistrationStatus(input.status)) return null;
  } else if (input.requestIds !== undefined || input.status !== undefined) return null;
  if (input.action === "early-access-add") {
    if (Object.keys(record).some((key) => !["action", "formToken", "website", "emails"].includes(key))
      || !Array.isArray(input.emails) || input.emails.length < 1 || input.emails.length > 500
      || input.emails.some((email) => typeof email !== "string" || email.length > 512 || email.includes("\u0000"))) return null;
    // Shape-invalid emails remain in the batch so the result can report them;
    // the handler binds the RPC's invalid values to this batch. NUL cannot cross
    // PostgreSQL's text transport, so it rejects the whole malformed request.
  } else if (input.emails !== undefined) return null;
  if (input.action === "early-access-remove") {
    if (Object.keys(record).some((key) => !["action", "formToken", "website", "entryIds"].includes(key))
      || !Array.isArray(input.entryIds) || input.entryIds.length < 1 || input.entryIds.length > 500
      || input.entryIds.some((id) => typeof id !== "string" || !staffUuid.test(id))) return null;
  } else if (input.entryIds !== undefined) return null;
  if (["priority-set", "priority-remove"].includes(input.action)
    && Object.keys(record).some((key) => !["action", "formToken", "website", "targetId", "reason"].includes(key))) return null;
  if (input.action === "password-change") {
    if (Object.keys(record).some((key) => !["action", "formToken", "password", "passwordConfirmation", "website"].includes(key))
      || !input.password || Array.from(input.password).length < 10 || Buffer.byteLength(input.password, "utf8") > 72
      || input.passwordConfirmation !== input.password) return null;
  } else if (input.passwordConfirmation !== undefined) return null;
  const needed = (keys: readonly (keyof StaffPayload)[]) => keys.every((key) => typeof input[key] === "string" && Boolean(input[key]));
  if (["signin", "invite", "invite-resend"].includes(input.action)) {
    input.email = input.email?.trim().toLowerCase();
    if (!input.email || input.email.length > 254 || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(input.email)) return null;
  }
  if (["signin", "invite-accept"].includes(input.action)) {
    if (!input.password || Buffer.byteLength(input.password, "utf8") > 72
      || input.action === "invite-accept" && Array.from(input.password).length < 10) return null;
  }
  if (input.action === "invite-accept") {
    input.name = input.name?.trim();
    if (!input.name || input.name.length > 120 || /[\x00-\x1f\x7f]/.test(input.name)
      || !input.invitationId || !staffUuid.test(input.invitationId) || !input.token || !/^[A-Za-z0-9_-]{43}$/.test(input.token)) return null;
  }
  if (["invite", "invite-resend", "roles"].includes(input.action)) {
    if (!Array.isArray(input.roles) || (input.action !== "roles" && input.roles.length < 1) || input.roles.length > ROLES.length - 1
      || new Set(input.roles).size !== input.roles.length || input.roles.some((role) => role === "participant" || !ROLES.includes(role))) return null;
  } else if (input.roles !== undefined) return null;
  if (["roles", "suspend", "reactivate", "revoke-sessions", "reset-authenticator", "reset-account", "reveal-identity", "priority-set", "priority-remove"].includes(input.action)
    && (!input.targetId || !staffUuid.test(input.targetId))) return null;
  if (input.action === "invite-revoke" && (!input.invitationId || !staffUuid.test(input.invitationId))) return null;
  if (["verify-email", "verify-totp"].includes(input.action)) {
    input.code = normalizeParticipantCode(input.code ?? "");
    if (!/^\d{6}$/.test(input.code)) return null;
  }
  if (input.action === "verify-totp" && !needed(["factorId", "challengeId"])) return null;
  if ([input.factorId, input.challengeId].some((id) => id !== undefined && !staffUuid.test(id))) return null;
  return input;
}
