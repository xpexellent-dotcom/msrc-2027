import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import type { ParticipantPageState } from "./contracts";
import { getParticipantConfig } from "./config.server";
import { participantNotice } from "./privacy.server";
import { observeParticipantPage, participantPageReady } from "./handler.server";

export async function readParticipantPageState(locale: Locale): Promise<ParticipantPageState> {
  const closed: ParticipantPageState = { enabled: false, notice: null, profile: null, sessionState: "anonymous" };
  const readiness = getParticipantConfig();
  if (readiness.state !== "ready") return closed;
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) return closed;
  // A strict fixed loopback fixture opens only synthetic UI presentation tests. No native provider request is made.
  if (readiness.config.testMode) return { ...closed, enabled: true, notice: participantNotice(locale, true) };
  if (!await participantPageReady(readiness.config)) return closed;
  const request = new Request(origin + "/api/participant-accounts", { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } });
  const profile = await observeParticipantPage(request, readiness.config);
  return { enabled: true, notice: participantNotice(locale, false), profile, sessionState: profile ? "authenticated" : "anonymous" };
}
