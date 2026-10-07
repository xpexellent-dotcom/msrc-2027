import "server-only";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { normalizeParticipantCode } from "@/features/participant-accounts/validation.server";
import { staffUuid } from "./security.server";

export const STAFF_ACTIONS = ["signin", "logout", "enroll-totp", "challenge-totp", "verify-totp", "challenge-email", "verify-email",
  "invite-accept", "invite", "invite-resend", "invite-revoke", "roles", "suspend", "reactivate", "revoke-sessions",
  "reset-authenticator", "reset-account", "reveal-identity", "password-change"] as const;
export interface StaffPayload {
  action: (typeof STAFF_ACTIONS)[number]; formToken: string; email?: string; name?: string; password?: string; passwordConfirmation?: string;
  code?: string; challengeId?: string; factorId?: string; invitationId?: string; token?: string; targetId?: string;
  roles?: Role[]; website?: string;
}
export function validateStaffPayload(value: unknown): StaffPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!STAFF_ACTIONS.includes(record.action as never) || typeof record.formToken !== "string") return null;
  const allowed = ["action", "formToken", "email", "name", "password", "passwordConfirmation", "code", "challengeId", "factorId", "invitationId", "token", "targetId", "roles", "website"];
  if (Object.keys(record).some((key) => !allowed.includes(key))
    || Object.entries(record).some(([key, entry]) => key !== "roles" && (typeof entry !== "string" || entry.length > (key === "formToken" ? 1024 : 512)))) return null;
  const input = { ...record } as unknown as StaffPayload;
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
  if (["roles", "suspend", "reactivate", "revoke-sessions", "reset-authenticator", "reset-account", "reveal-identity"].includes(input.action)
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
