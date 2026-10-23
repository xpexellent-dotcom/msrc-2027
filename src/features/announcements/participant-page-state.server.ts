import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import { createParticipantAnnouncementsHandler } from "./participant-handler.server";
import type { ParticipantAnnouncementsResponse } from "./participant-contracts";

const observe = createParticipantAnnouncementsHandler({ observeOnly: true });
export async function readParticipantAnnouncementsPageState(locale: Locale): Promise<ParticipantAnnouncementsResponse> {
  const readiness = getParticipantConfig();
  if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/announcements?locale=" + locale, {
    headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" },
  }));
  return await response.json() as ParticipantAnnouncementsResponse;
}
