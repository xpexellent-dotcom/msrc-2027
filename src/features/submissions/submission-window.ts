/** ENG-092 / TIM-01/02: Asia/Riyadh inputs, explicit UTC transport; [open, close). */
export function riyadhToUtc(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const instant = new Date(value + ":00+03:00");
  if (!Number.isFinite(instant.getTime())) return null;
  return utcToRiyadh(instant.toISOString()) === value ? instant.toISOString() : null;
}
export function utcToRiyadh(value: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 16) : "";
}
export const explicitUtc = (value: unknown): value is string | null => value === null || typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
export function validWindow(opensAt: unknown, closesAt: unknown): boolean {
  return explicitUtc(opensAt) && explicitUtc(closesAt) && ((opensAt === null && closesAt === null) || typeof opensAt === "string" && typeof closesAt === "string" && Date.parse(closesAt) > Date.parse(opensAt));
}
export type SubmissionWindow = {
  version: number; enabled: boolean; opensAt: string | null; closesAt: string | null;
  evidenceReady: boolean; similarityReady: boolean; participantEnabled: boolean; privacyReady: boolean;
  emailReady: boolean; retentionReady: boolean; deploymentReady: boolean; observedAt: string;
};
export const WINDOW_GATES = ["enabled", "dates", "time", "evidence", "similarity", "accounts", "privacy", "email", "retention", "deployment"] as const;
export type WindowGate = typeof WINDOW_GATES[number];
export function windowReadiness(window: SubmissionWindow, now = Date.parse(window.observedAt)): Record<WindowGate, boolean> {
  const dates = validWindow(window.opensAt, window.closesAt) && window.opensAt !== null;
  return { enabled: window.enabled, dates, time: dates && now >= Date.parse(window.opensAt!) && now < Date.parse(window.closesAt!),
    evidence: window.evidenceReady, similarity: window.similarityReady, accounts: window.participantEnabled,
    privacy: window.privacyReady, email: window.emailReady, retention: window.retentionReady, deployment: window.deploymentReady };
}
export type PublicSubmissionWindow = { state: "opening" | "open" | "closed" | "area-not-ready"; opensAt: string | null; closesAt: string | null };
export function publicWindowState(window: SubmissionWindow): PublicSubmissionWindow {
  const gates = windowReadiness(window);
  return { state: gates.dates && Date.parse(window.observedAt) < Date.parse(window.opensAt!) ? "opening" : Object.values(gates).every(Boolean) ? "open" : "closed", opensAt: window.opensAt, closesAt: window.closesAt };
}
export function decodeSubmissionWindow(value: unknown): SubmissionWindow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as SubmissionWindow;
  if (!Number.isSafeInteger(row.version) || row.version < 0 || !explicitUtc(row.opensAt) || !explicitUtc(row.closesAt) || !explicitUtc(row.observedAt) || row.observedAt === null
    || !["enabled", "evidenceReady", "similarityReady", "participantEnabled", "privacyReady", "emailReady", "retentionReady", "deploymentReady"].every((key) => typeof (value as Record<string, unknown>)[key] === "boolean")) return null;
  return Object.fromEntries(["version", "opensAt", "closesAt", "observedAt", "enabled", "evidenceReady", "similarityReady", "participantEnabled", "privacyReady", "emailReady", "retentionReady", "deploymentReady"].map((key) => [key, (value as Record<string, unknown>)[key]])) as SubmissionWindow;
}
// ORG-058 publishes dates only. Suggested, never persisted automatically.
export const PUBLISHED_WINDOW = { opensAt: "2026-11-22T21:00:00.000Z", closesAt: "2026-12-13T20:59:00.000Z" };
