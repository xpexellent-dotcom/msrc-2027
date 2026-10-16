import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import type { RegistrationResponse } from "./contracts";
import { createRegistrationHandler } from "./handler.server";

const observeRegistrationRequest = createRegistrationHandler({ observeOnly: true });

export async function readRegistrationPageState(locale: Locale): Promise<RegistrationResponse | null> {
  if (process.env.REGISTRATION_ENABLED !== "true") return null;
  const readiness = getParticipantConfig();
  if (readiness.state !== "ready") return null;
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) return null;
  const response = await observeRegistrationRequest(new Request(origin + "/api/workflows/registration?locale=" + locale, {
    headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" },
  }));
  if (!response.ok && response.status !== 401) return null;
  const value = await response.json() as RegistrationResponse;
  return ["ready", "submitted", "denied"].includes(value.state) ? value : null;
}
