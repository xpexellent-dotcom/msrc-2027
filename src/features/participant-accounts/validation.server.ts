import "server-only";
import { PARTICIPANT_ACTIONS, type ParticipantField, type ParticipantPayload, type ParticipantResponse } from "./contracts";
import { participantUuid } from "./security.server";

export function normalizeParticipantCode(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0)).trim();
}
export function validateParticipantPayload(value: unknown): { ok: true; value: ParticipantPayload } | { ok: false; fieldErrors?: ParticipantResponse["fieldErrors"] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false };
  const record = value as Record<string, unknown>;
  const allowed = ["action", "name", "email", "password", "code", "requestId", "formToken", "website"];
  if (Object.keys(record).some((key) => !allowed.includes(key)) || !PARTICIPANT_ACTIONS.includes(record.action as never)
    || Object.entries(record).some(([, entry]) => typeof entry !== "string")) return { ok: false };
  const input = { ...record } as unknown as ParticipantPayload;
  const errors: Partial<Record<ParticipantField, "required" | "invalid" | "too_long">> = {};
  if (input.action !== "logout") {
    input.email = input.email?.trim().toLowerCase();
    if (!input.email) errors.email = "required";
    else if (input.email.length > 254) errors.email = "too_long";
    else if (!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(input.email)) errors.email = "invalid";
  }
  if (input.action === "signup") {
    input.name = input.name?.trim();
    if (!input.name) errors.name = "required";
    else if (input.name.length > 120) errors.name = "too_long";
    else if (/[\x00-\x1f\x7f]/.test(input.name)) errors.name = "invalid";
  }
  if (["signup", "signin", "verify", "reset"].includes(input.action)) {
    if (!input.password) errors.password = "required";
    else if (Buffer.byteLength(input.password, "utf8") > 72) errors.password = "too_long";
    else if (input.action !== "signin" && Array.from(input.password).length < 10) errors.password = "invalid";
  }
  if (["verify", "reset"].includes(input.action)) {
    input.code = normalizeParticipantCode(input.code ?? "");
    if (!/^[0-9]{6}$/.test(input.code)) errors.code = "invalid";
    if (!input.requestId || !participantUuid.test(input.requestId)) errors.code = "invalid";
  }
  if (input.name !== undefined && (input.name.length > 120 || /[\x00-\x1f\x7f]/.test(input.name))) errors.name = "invalid";
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, value: input };
}
