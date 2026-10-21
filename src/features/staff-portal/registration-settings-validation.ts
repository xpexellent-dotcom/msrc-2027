import type { StaffRegistrationSettings, StaffRegistrationSettingsChanges, StaffRegistrationSettingsField } from "./ui-contract";
import { validConferenceDays } from "@/features/attendance/conference-days";

export const REGISTRATION_SETTINGS_FIELDS = ["enabled", "terms_version", "payment_required", "general_capacity", "early_access_start_at", "early_access_end_at",
  "priority_start_at", "priority_end_at", "general_opening_at", "closing_at", "offer_window_hours", "places_remaining_threshold", "minimum_age",
  "waitlist_offer_hours", "confirm_seat_lead_days", "confirm_seat_response_hours", "payment_window_hours", "conference_days"] as const satisfies readonly StaffRegistrationSettingsField[];
export const REGISTRATION_SETTINGS_TIMESTAMPS = ["early_access_start_at", "early_access_end_at", "priority_start_at", "priority_end_at", "general_opening_at", "closing_at"] as const;
const positive = ["general_capacity", "offer_window_hours", "waitlist_offer_hours", "confirm_seat_response_hours", "payment_window_hours", "default_workshop_capacity"];
const nonnegative = ["confirm_seat_lead_days", "places_remaining_threshold"];

/** Explicit offsets avoid silently interpreting a server or browser's local timezone. */
export function validSettingsTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const local = value.slice(0, 19), calendar = new Date(local + "Z");
  return Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 19) === local;
}

export function validRegistrationSetting(field: string, value: unknown, saving = true): boolean {
  if (field === "enabled") return typeof value === "boolean";
  if (value === null) return REGISTRATION_SETTINGS_FIELDS.includes(field as StaffRegistrationSettingsField) || field === "default_workshop_capacity";
  if (field === "payment_required") return typeof value === "boolean";
  if (field === "conference_days") return validConferenceDays(value);
  if (field === "terms_version") return typeof value === "string" && value === value.replace(/^ +| +$/g, "")
    && Array.from(value).length >= 1 && Array.from(value).length <= 128 && !value.includes("\0");
  if ((REGISTRATION_SETTINGS_TIMESTAMPS as readonly string[]).includes(field)) return validSettingsTimestamp(value);
  if (typeof value !== "number" || !Number.isInteger(value) || value > 2_147_483_647) return false;
  if (field === "minimum_age") return saving ? value === 18 : value >= 18;
  return positive.includes(field) ? value > 0 : nonnegative.includes(field) && value >= 0;
}

/** Partial changes are merged and checked under the database allocation lock. */
export function registrationSettingsChanges(value: unknown): StaffRegistrationSettingsChanges | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([field, entry]) => !(REGISTRATION_SETTINGS_FIELDS as readonly string[]).includes(field) || !validRegistrationSetting(field, entry))) return null;
  return Object.fromEntries(entries) as StaffRegistrationSettingsChanges;
}

/** Mirrors the existing settings_complete requirements and table checks for form feedback. */
export function registrationSettingsComplete(settings: StaffRegistrationSettings | StaffRegistrationSettingsChanges | null): boolean {
  if (!settings) return false;
  const required = REGISTRATION_SETTINGS_FIELDS.filter((field) => !["enabled", "offer_window_hours", "payment_window_hours", "conference_days"].includes(field));
  if (required.some((field) => settings[field] == null) || Object.entries(settings).some(([field, value]) => !validRegistrationSetting(field, value))
    || settings.payment_required && settings.payment_window_hours == null) return false;
  // PostgreSQL retains microseconds. Date.parse alone can collapse two distinct
  // stored instants in the same millisecond and incorrectly mark them incomplete.
  const time = (field: typeof REGISTRATION_SETTINGS_TIMESTAMPS[number]) => {
    const value = settings[field]!, fraction = /\.(\d+)/.exec(value)?.[1] ?? "";
    return BigInt(Date.parse(value)) * BigInt(1000) + BigInt(fraction.padEnd(6, "0").slice(3));
  };
  return time("priority_start_at") < time("priority_end_at") && time("priority_end_at") <= time("general_opening_at")
    && time("early_access_start_at") < time("early_access_end_at") && time("early_access_end_at") <= time("general_opening_at")
    && time("general_opening_at") < time("closing_at");
}

/** Riyadh has a fixed UTC+03:00 offset; never use the browser timezone. */
export function riyadhLocalToTimestamp(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return null;
  const timestamp = (value.length === 16 ? value + ":00" : value) + "+03:00";
  return validSettingsTimestamp(timestamp) ? new Date(timestamp).toISOString() : null;
}
export function timestampToRiyadhLocal(value: string | null): string {
  if (!validSettingsTimestamp(value)) return "";
  return new Date(Date.parse(value) + 3 * 3_600_000).toISOString().slice(0, 23).replace(/\.000$/, "").replace(/:00$/, "");
}
