import "server-only";
import { headers } from "next/headers";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import type { Locale } from "@/lib/i18n";
import type { ResearchParticipantResponse } from "./participant-contracts";
import { createResearchParticipantHandler } from "./participant-handler.server";
const observe = createResearchParticipantHandler({ observeOnly: true });
export async function readResearchParticipantPageState(locale: Locale): Promise<ResearchParticipantResponse> {
  if (process.env.RESEARCH_JUDGING_ENABLED !== "true") return { state: "closed" };
  const readiness = getParticipantConfig(); if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers(), origin = readiness.config.origins.find((value) => new URL(value).host === current.get("host")); if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/research-event?locale=" + locale, { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } }));
  return response.json() as Promise<ResearchParticipantResponse>;
}
