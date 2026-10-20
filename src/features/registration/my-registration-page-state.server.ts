import "server-only";
import { headers } from "next/headers";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import type { Locale } from "@/lib/i18n";
import type { MyRegistrationResponse } from "./contracts";
import { createMyRegistrationHandler } from "./my-registration-handler.server";

const observe = createMyRegistrationHandler({ observeOnly: true });
export async function readMyRegistrationPageState(locale: Locale): Promise<MyRegistrationResponse> {
  if (process.env.REGISTRATION_ENABLED !== "true") return { state: "closed" };
  const readiness = getParticipantConfig();
  if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/registration/me?locale=" + locale, {
    headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" },
  }));
  return await response.json() as MyRegistrationResponse;
}
