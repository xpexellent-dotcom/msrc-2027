import type { Locale } from "@/lib/i18n";
import type { WorkshopParticipantAction, WorkshopParticipantResponse } from "./participant-contracts";

/** An uncertain response retries the same operation; database idempotency owns its result. */
export function createWorkshopRequester(request: typeof fetch = fetch, uuid: () => string = () => crypto.randomUUID()) {
  const operations = new Map<string, string>();
  return async (action: WorkshopParticipantAction, id: string, formToken: string, locale: Locale) => {
    const key = action + ":" + id;
    const operationId = operations.get(key) ?? uuid();
    operations.set(key, operationId);
    const response = await request("/api/workshops?locale=" + locale, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, [action === "request" || action === "waitlist" ? "workshopId" : "bookingId"]: id, operationId, formToken }) });
    const value: WorkshopParticipantResponse = await response.json();
    if (response.status < 500 && (value.state === "ready" && ["updated", "conflict", "full", "expired", "not_found"].includes(String(value.outcome))
      || ["denied", "invalid_input", "limited"].includes(value.state))) operations.delete(key);
    return { response, value };
  };
}
