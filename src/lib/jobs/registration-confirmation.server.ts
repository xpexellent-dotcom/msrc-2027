import "server-only";

import type { OutboxDatabaseConfig } from "./outbox-store.server";

export type ConfirmationMaintenanceResult = { state: "closed" | "area-not-ready" }
  | { state: "updated"; opened: number; released: number; kept: number; offered: number };

/** Reuses the authenticated outbox cron. This RPC never selects a nonresponse policy
 * or creates a round: a Super Admin must already have started one explicitly. */
export async function maintainRegistrationConfirmations(config: OutboxDatabaseConfig, editionKey: string): Promise<ConfirmationMaintenanceResult> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(editionKey)) throw new Error("Confirmation maintenance unavailable.");
  try {
    const response = await fetch(config.databaseUrl + "/rest/v1/rpc/msrc_registration_confirmation_maintenance", {
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
    if (row.state !== "updated" || Object.keys(row).length !== 5
      || !["opened", "released", "kept", "offered"].every((key) => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0)) throw new Error();
    return { state: "updated", opened: Number(row.opened), released: Number(row.released), kept: Number(row.kept), offered: Number(row.offered) };
  } catch { throw new Error("Confirmation maintenance unavailable."); }
}
