import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import { getParticipantConfig } from "@/features/participant-accounts/config.server";
import type { ParticipantCertificateResponse } from "@/lib/certificates/contracts";
import { createCertificateParticipantHandler } from "./participant-handler.server";

const observe = createCertificateParticipantHandler({ observeOnly: true });
export async function readParticipantCertificatesPageState(locale: Locale): Promise<ParticipantCertificateResponse> {
  if (process.env.CERTIFICATES_ENABLED !== "true") return { state: "closed" };
  const readiness = getParticipantConfig(); if (readiness.state !== "ready") return { state: "closed" };
  const current = await headers(), origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) return { state: "closed" };
  const response = await observe(new Request(origin + "/api/certificates?locale=" + locale, {
    headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" },
  }));
  return response.json() as Promise<ParticipantCertificateResponse>;
}
