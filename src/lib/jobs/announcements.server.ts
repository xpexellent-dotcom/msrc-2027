import "server-only";

import type { OutboxDatabaseConfig } from "./outbox-store.server";

export type AnnouncementRetentionCounts = { announcements: number; recipients: number; inbox: number; operations: number };
export type AnnouncementMaintenanceResult = { state: "closed" | "area-not-ready" }
  | { state: "updated"; started: number; needsReview: number; retention?: AnnouncementRetentionCounts };

/** Reuses the existing authenticated outbox drain. No new scheduler or activation.
 * Missing hosted migrations are a readiness result, never an authentication error. */
export async function maintainAnnouncements(config: OutboxDatabaseConfig, editionKey: string): Promise<AnnouncementMaintenanceResult> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(editionKey)) throw new Error("Announcement maintenance unavailable.");
  try {
    const response = await fetch(config.databaseUrl + "/rest/v1/rpc/msrc_announcements_maintenance", {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3_000),
      headers: { apikey: config.databaseKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ edition_key: editionKey }),
    });
    const value: unknown = await response.json();
    if (!response.ok) {
      if (value && typeof value === "object" && "code" in value && ["PGRST202", "42883"].includes(String(value.code))) {
        return { state: "area-not-ready" };
      }
      throw new Error();
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    const row = value as Record<string, unknown>;
    if (row.state === "closed" && Object.keys(row).length === 1) return { state: "closed" };
    const hasRetention = Object.hasOwn(row, "retention");
    if (row.state !== "updated" || Object.keys(row).length !== (hasRetention ? 4 : 3)
      || !["started", "needsReview"].every((key) => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0)) throw new Error();
    // Accept the older migration response until the pending retention migration lands.
    let retention: AnnouncementRetentionCounts | undefined;
    if (hasRetention) {
      if (!row.retention || typeof row.retention !== "object" || Array.isArray(row.retention)) throw new Error();
      const counts = row.retention as Record<string, unknown>;
      if (Object.keys(counts).length !== 4 || !["announcements", "recipients", "inbox", "operations"]
        .every((key) => Number.isSafeInteger(counts[key]) && Number(counts[key]) >= 0
          && Number(counts[key]) <= (key === "announcements" ? 20 : 500))) throw new Error();
      retention = counts as AnnouncementRetentionCounts;
    }
    return { state: "updated", started: Number(row.started), needsReview: Number(row.needsReview), ...(retention ? { retention } : {}) };
  } catch { throw new Error("Announcement maintenance unavailable."); }
}
