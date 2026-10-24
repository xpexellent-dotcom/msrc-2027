import "server-only";
import { headers } from "next/headers";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import type { Locale } from "@/lib/i18n";
import type { CompetitionKind, CompetitionResponse } from "./contracts";
import { createCompetitionHandler } from "./handler.server";
const observe = createCompetitionHandler({ observeOnly: true });
export async function readCompetitionPageState(locale: Locale, kind: CompetitionKind = "hackathon"): Promise<CompetitionResponse> {
  if (process.env.COMPETITIONS_ENABLED !== "true") return { state: "closed" };
  const readiness = getParticipantConfig(); if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers(), origin = readiness.config.origins.find((value) => new URL(value).host === current.get("host")); if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/competitions?locale=" + locale + "&kind=" + kind, { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } }));
  return response.json() as Promise<CompetitionResponse>;
}
