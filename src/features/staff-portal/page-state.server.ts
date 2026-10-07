import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStaffConfig } from "./config.server";
import { observeStaffPage, staffPageReady } from "./handler.server";

/** The gate runs before session/data reads; unavailable configuration also stays invisible. */
export async function readStaffPageState() {
  const readiness = getStaffConfig();
  if (readiness.state !== "ready") notFound();
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin || !await staffPageReady(readiness.config)) notFound();
  const request = new Request(origin + "/api/staff-portal", { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } });
  return { profile: await observeStaffPage(request, readiness.config), testMode: readiness.config.testMode };
}
