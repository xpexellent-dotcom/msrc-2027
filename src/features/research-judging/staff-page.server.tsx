import "server-only";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { readStaffPageState } from "@/features/staff-portal/page-state.server";
import { StaffResearchWorkspace } from "./staff-workspace";
import { researchStaffCopy } from "./staff-copy";
import "@/styles/staff-portal.css";
import "@/styles/staff-console.css";
import "./staff.css";
export async function ResearchStaffPage({ params, mode = "staff" }: { params: Promise<{ locale: string }>; mode?: "staff" | "judge" }) {
  const { locale } = await params;
  if (!isLocale(locale) || process.env.RESEARCH_JUDGING_ENABLED !== "true") notFound();
  if (mode === "judge" && locale !== "en") redirect("/en/judge/research");
  const state = await readStaffPageState(), copy = researchStaffCopy[locale];
  if (state.profile) { const roles = state.profile.roles; if (!(roles.includes("superAdmin") || (mode === "judge" ? roles.includes("facultyJudge") : roles.includes("scientificAdministrator") || roles.includes("judgingCommittee")))) notFound(); }
  return <div className="staff-portal research-console" dir={mode === "staff" && locale === "ar" ? "rtl" : "ltr"} lang={mode === "staff" ? locale : "en"}><a href={`/${locale}/staff`}>{copy.back}</a><header className="staff-heading"><p>MSRC 2027</p><h1>{mode === "staff" ? copy.title : researchStaffCopy.en.judgeTitle}</h1></header>{state.profile ? <StaffResearchWorkspace locale={mode === "judge" ? "en" : locale} roles={state.profile.roles} mode={mode} /> : <p role="status"><a href={`/${locale}/staff/sign-in`}>{copy.denied}</a></p>}</div>;
}
