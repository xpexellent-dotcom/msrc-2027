import "server-only";
import { ROLES, type Role } from "@/lib/permissions/contract";
import { evaluateActivationEnvironment } from "@/lib/activation/readiness";
import type { StaffLaunchCheckKey, StaffLaunchReadiness, StaffReadinessStatus, StaffRegistrationSettingsView } from "./ui-contract";

const booleans = ["participantAccountsEnabled", "participantPolicyComplete", "retentionEnabled", "outboxDeliveryEnabled", "outboxSweepsEnabled", "registrationSettingsComplete", "confirmationSettingsSet", "registrationEnabled", "conferenceDaysSet", "secondSuperAdminWithAuthenticator", "healthReady", "lastOutboxDrainObservable"] as const;
const counts = ["participantEmailDailyLimit", "outboxDailyCap", "conferenceDayCount", "earlyAccessCount", "superAdminsWithAuthenticatorCount"] as const;
const rpcKeys = ["participantAccounts", "registration", "registrationSettings", "confirmation", "earlyAccess", "tickets", "checkIn", "outbox", "health"] as const;
const roles = ROLES.filter((role): role is Exclude<Role, "participant"> => role !== "participant");
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: readonly string[]) => Object.keys(row).sort().join(",") === [...keys].sort().join(",");
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** Explicit aggregate projection. Environment values and person-level records never enter the response. */
export function launchReadinessProjection(value: unknown, settings: StaffRegistrationSettingsView, env: Record<string, string | undefined>): StaffLaunchReadiness | null {
  const data = record(value), staff = record(data?.staffCounts), requiredRpcs = record(data?.requiredRpcs);
  if (!data || !exact(data, ["state", ...booleans, ...counts, "staffCounts", "requiredRpcs"]) || data.state !== "ready"
    || booleans.some((key) => typeof data[key] !== "boolean") || counts.some((key) => !count(data[key]))
    || !staff || !exact(staff, roles) || roles.some((role) => !count(staff[role]))
    || !requiredRpcs || !exact(requiredRpcs, rpcKeys) || rpcKeys.some((key) => typeof requiredRpcs[key] !== "boolean")
    || data.lastOutboxDrainObservable !== false
    || data.registrationEnabled !== (settings.settings?.enabled ?? false) || data.registrationSettingsComplete !== settings.settingsComplete
    || data.confirmationSettingsSet !== (settings.settings?.confirm_seat_lead_days != null && settings.settings?.confirm_seat_response_hours != null && (settings.settings?.conference_days?.length ?? 0) > 0)
    || data.conferenceDayCount !== (settings.settings?.conference_days?.length ?? 0)
    || data.secondSuperAdminWithAuthenticator !== ((data.superAdminsWithAuthenticatorCount as number) >= 2)
    || (data.superAdminsWithAuthenticatorCount as number) > (staff.superAdmin as number)) return null;
  const checks: StaffLaunchReadiness["checks"] = [];
  const add = (key: StaffLaunchCheckKey, ready: boolean, otherwise: StaffReadinessStatus = "red") => checks.push({ key, status: ready ? "green" : otherwise });
  add("migrations", rpcKeys.every((key) => requiredRpcs[key] === true));
  add("settings", data.registrationSettingsComplete === true);
  add("confirmationSettings", data.confirmationSettingsSet === true);
  add("participantAccounts", data.participantAccountsEnabled === true);
  add("participantPolicy", data.participantPolicyComplete === true && String(data.participantEmailDailyLimit) === env.PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT);
  add("retention", data.retentionEnabled === true);
  add("outboxDelivery", data.outboxDeliveryEnabled === true);
  add("outboxSweeps", data.outboxSweepsEnabled === true);
  add("outboxCap", (data.outboxDailyCap as number) > 0);
  add("conferenceDays", data.conferenceDaysSet === true && data.conferenceDayCount === 2);
  add("approvers", (staff.registrationWorkshopAdministrator as number) >= 2, "amber");
  add("checkInStaff", (staff.checkInStaff as number) >= 1);
  add("earlyAccess", (data.earlyAccessCount as number) > 0, "amber");
  add("secondSuperAdmin", data.secondSuperAdminWithAuthenticator === true);
  add("health", data.healthReady === true);
  add("latestDrain", false, "amber");
  const source = settings.settings;
  return {
    checks,
    environment: evaluateActivationEnvironment(env).map((check) => ({ ...check, status: !check.valid ? "red" : check.enabled === false ? "amber" : "green" })),
    requiredRpcs: requiredRpcs as StaffLaunchReadiness["requiredRpcs"], staffCounts: staff as StaffLaunchReadiness["staffCounts"],
    earlyAccessCount: data.earlyAccessCount as number, outboxDailyCap: data.outboxDailyCap as number,
    participantEmailDailyLimit: data.participantEmailDailyLimit as number, superAdminsWithAuthenticatorCount: data.superAdminsWithAuthenticatorCount as number,
    registrationEnabled: data.registrationEnabled as boolean,
    settings: source ? { general_capacity: source.general_capacity, priority_start_at: source.priority_start_at, priority_end_at: source.priority_end_at,
      general_opening_at: source.general_opening_at, closing_at: source.closing_at, conference_days: source.conference_days,
      confirm_seat_lead_days: source.confirm_seat_lead_days, confirm_seat_response_hours: source.confirm_seat_response_hours } : null,
  };
}
