import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStaffConfig } from "./config.server";
import { observeStaffPage, type StaffProfile } from "./handler.server";
import { staffFormToken } from "./security.server";

type StaffPageState = { profile: StaffProfile | null; testMode: boolean; navigationFormToken?: string };

/** The gate runs before session/data reads; unavailable configuration also stays invisible. */
export async function readStaffPageState({ prepareNavigation = false } = {}): Promise<StaffPageState> {
  const readiness = getStaffConfig();
  if (readiness.state !== "ready") notFound();
  const current = await headers();
  const origin = readiness.config.origins.find((candidate) => new URL(candidate).host === current.get("host"));
  if (!origin) notFound();
  const request = new Request(origin + "/api/staff-portal", { headers: { host: new URL(origin).host, cookie: current.get("cookie") ?? "" } });
  const { enabled, profile } = await observeStaffPage(request, readiness.config);
  if (!enabled) notFound();
  // Staff pages are private and no-store. Give a verified session a one-use
  // form token for the first navigation activity request.
  const state = { profile, testMode: readiness.config.testMode };
  return prepareNavigation && profile
    ? { ...state, navigationFormToken: staffFormToken(readiness.config, origin) } : state;
}
