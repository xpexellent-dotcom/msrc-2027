import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import type { StaffScreen } from "./ui-contract";
import { readStaffPageState } from "./page-state.server";
import { StaffPortal } from "./staff-portal";
import { canChangeOwnPassword, staffMenu } from "./menu";
import type { LandingKey } from "./console-copy";
import { getStaffConfig } from "./config.server";
import { staffPasswordChangeReady } from "./handler.server";
import { renderRegistrationEmailPreviews } from "./email-previews.server";

export async function StaffPage({ params, screen, landing }: { params: Promise<{ locale: string }>; screen: StaffScreen; landing?: LandingKey }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const readiness = getStaffConfig();
  const passwordChangeAvailable = readiness.state === "ready" && await staffPasswordChangeReady(readiness.config);
  if (screen === "security" && !passwordChangeAvailable) notFound();
  const state = await readStaffPageState();
  if (screen === "security" && state.profile && !canChangeOwnPassword(state.profile.roles)) notFound();
  // Navigation projection only; every API and RPC rechecks the current grants.
  const area = landing ?? (["people", "audit", "participants", "registration", "priority", "early-access", "registration-settings", "email-previews", "check-in", "launch-readiness", "announcements", "certificates"].includes(screen) ? screen : null);
  if (area && state.profile && !staffMenu(state.profile.roles).some((entry) => entry.key === area)) notFound();
  const emailPreviews = screen === "email-previews" && state.profile?.roles.includes("superAdmin") ? renderRegistrationEmailPreviews() : undefined;
  return <StaffPortal locale={landing === "review" ? "en" : locale} screen={screen} landing={landing} initialProfile={state.profile} initialPasswordChangeAvailable={passwordChangeAvailable} initialEmailPreviews={emailPreviews} testMode={state.testMode} />;
}
