import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import type { StaffScreen } from "./ui-contract";
import { readStaffPageState } from "./page-state.server";
import { StaffPortal } from "./staff-portal";
import { canChangeOwnPassword, staffMenu } from "./menu";
import { getStaffConfig } from "./config.server";
import { staffPasswordChangeReady } from "./handler.server";

export async function StaffPage({ params, screen }: { params: Promise<{ locale: string }>; screen: StaffScreen }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const readiness = getStaffConfig();
  const passwordChangeAvailable = readiness.state === "ready" && await staffPasswordChangeReady(readiness.config);
  if (screen === "security" && !passwordChangeAvailable) notFound();
  const state = await readStaffPageState();
  if (screen === "security" && state.profile && !canChangeOwnPassword(state.profile.roles)) notFound();
  if (["people", "audit", "participants"].includes(screen) && state.profile
    && !staffMenu(state.profile.roles).some((entry) => entry.key === screen)) notFound();
  return <StaffPortal locale={locale} screen={screen} initialProfile={state.profile} initialPasswordChangeAvailable={passwordChangeAvailable} testMode={state.testMode} />;
}
