import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import type { StaffScreen } from "./ui-contract";
import { readStaffPageState } from "./page-state.server";
import { StaffPortal } from "./staff-portal";
import { staffMenu } from "./menu";

export async function StaffPage({ params, screen }: { params: Promise<{ locale: string }>; screen: StaffScreen }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const state = await readStaffPageState();
  if (["people", "audit", "participants"].includes(screen) && state.profile
    && !staffMenu(state.profile.roles).some((entry) => entry.key === screen)) notFound();
  return <StaffPortal locale={locale} screen={screen} initialProfile={state.profile} testMode={state.testMode} />;
}
