import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import { createWorkshopParticipantHandler } from "./participant-handler.server";
import type { WorkshopParticipantResponse } from "./participant-contracts";

const observe = createWorkshopParticipantHandler({ observeOnly: true });
export async function readWorkshopBookingsPageState(locale: Locale): Promise<WorkshopParticipantResponse> {
  if (process.env.WORKSHOP_BOOKING_ENABLED !== "true") return { state: "closed" };
  const readiness = getParticipantConfig();
  if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/workshops?locale=" + locale, { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } }));
  return response.json() as Promise<WorkshopParticipantResponse>;
}
