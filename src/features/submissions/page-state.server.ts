import "server-only";
import { headers } from "next/headers";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import type { Locale } from "@/lib/i18n";
import type { AbstractResponse } from "./contracts";
import { createAbstractHandler } from "./handler.server";
const observe = createAbstractHandler({ observeOnly: true });
export async function readAbstractPageState(locale: Locale): Promise<AbstractResponse> {
  if (process.env.ABSTRACT_SUBMISSIONS_ENABLED !== "true") return { state: "closed" };
  const readiness = getParticipantConfig(); if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers(), origin = readiness.config.origins.find((value) => new URL(value).host === current.get("host"));
  if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/abstracts?locale=" + locale, { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } }));
  return response.json() as Promise<AbstractResponse>;
}
