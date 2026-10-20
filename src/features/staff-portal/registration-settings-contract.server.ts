import "server-only";
import { staffUuid } from "./security.server";
import { REGISTRATION_SETTINGS_FIELDS, registrationSettingsComplete, validRegistrationSetting, validSettingsTimestamp } from "./registration-settings-validation";
import type { StaffRegistrationSettings, StaffRegistrationSettingsAudit, StaffRegistrationSettingsView } from "./ui-contract";

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: readonly string[]) => Object.keys(row).sort().join(",") === [...keys].sort().join(",");
const uuid = (value: unknown): value is string => typeof value === "string" && staffUuid.test(value);

/** Explicit private projection: newly added database columns never leak automatically. */
export function registrationSettingsProjection(value: unknown, editionKey: string, operationId?: string): StaffRegistrationSettingsView | null {
  const data = record(value);
  if (!data || !exact(data, ["state", "settings", "settingsComplete", "participantAccountsReady", "history", ...(operationId ? ["operationId"] : [])])
    || data.state !== (operationId ? "updated" : "ready") || operationId && data.operationId !== operationId
    || typeof data.settingsComplete !== "boolean" || typeof data.participantAccountsReady !== "boolean"
    || !Array.isArray(data.history) || data.history.length > 20) return null;
  let settings: StaffRegistrationSettings | null = null;
  if (data.settings !== null) {
    const source = record(data.settings), keys = [...REGISTRATION_SETTINGS_FIELDS, "default_workshop_capacity"];
    if (!source || Object.keys(source).some((field) => ![...keys, "edition_key", "updated_at"].includes(field))
      || keys.some((field) => !(field in source) || !validRegistrationSetting(field, source[field], false))
      || source.edition_key !== undefined && source.edition_key !== editionKey
      || source.updated_at !== undefined && !validSettingsTimestamp(source.updated_at)) return null;
    settings = Object.fromEntries(keys.map((key) => [key, source[key]])) as StaffRegistrationSettings;
  }
  if (data.settingsComplete !== registrationSettingsComplete(settings)) return null;
  const history: StaffRegistrationSettingsAudit[] = [], ids = new Set<string>(), operations = new Set<string>();
  let previous = Infinity;
  for (const value of data.history) {
    const row = record(value), changes = record(row?.changes);
    if (!row || !exact(row, ["id", "operationId", "performerId", "performerName", "at", "changes"])
      || !uuid(row.id) || !uuid(row.operationId) || row.performerId !== null && !uuid(row.performerId)
      || row.performerName !== null && (typeof row.performerName !== "string" || !row.performerName.length || row.performerName.length > 200 || /[\x00-\x1f\x7f]/.test(row.performerName))
      || !validSettingsTimestamp(row.at) || !changes) return null;
    for (const [field, value] of Object.entries(changes)) {
      const change = record(value);
      if (!(REGISTRATION_SETTINGS_FIELDS as readonly string[]).includes(field) || !change || !exact(change, ["before", "after"])
        || [change.before, change.after].some((entry) => entry !== null && !validRegistrationSetting(field, entry, false))) return null;
    }
    const time = Date.parse(row.at), id = row.id.toLowerCase(), operation = row.operationId.toLowerCase();
    if (time > previous || ids.has(id) || operations.has(operation)) return null;
    previous = time; ids.add(id); operations.add(operation); history.push(row as StaffRegistrationSettingsAudit);
  }
  return { settings, settingsComplete: data.settingsComplete, participantAccountsReady: data.participantAccountsReady, history };
}
