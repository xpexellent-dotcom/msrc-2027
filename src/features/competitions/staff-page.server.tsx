import "server-only";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { readStaffPageState } from "@/features/staff-portal/page-state.server";
import { StaffCompetitionWorkspace } from "./staff-workspace";
import { staffCompetitionCopy } from "./staff-copy";
import "@/styles/staff-portal.css";
import "@/styles/staff-console.css";
import "./staff.css";

export async function CompetitionStaffPage({ params, mode = "staff" }: { params: Promise<{ locale: string }>; mode?: "staff" | "reviewer" | "judge" }) {
  const { locale } = await params;
  if (!isLocale(locale) || process.env.COMPETITIONS_ENABLED !== "true") notFound();
  if (mode !== "staff" && locale !== "en") redirect(`/en/${mode === "judge" ? "judge" : "reviewer"}/competitions`);
  const state = await readStaffPageState(), copy = staffCompetitionCopy[locale];
  if (state.profile) {
    const roles = state.profile.roles, allowed = roles.includes("superAdmin") || (mode === "staff" ? roles.includes("scientificAdministrator") || roles.includes("judgingCommittee") : mode === "judge" ? roles.includes("facultyJudge") : roles.includes("hackathonReviewer") || roles.includes("threeMinuteThesisReviewer"));
    if (!allowed) notFound();
  }
  return <div className="staff-portal competition-console" dir={mode === "staff" && locale === "ar" ? "rtl" : "ltr"} lang={mode === "staff" ? locale : "en"}><a href={`/${locale}/staff`}>{copy.back}</a><header className="staff-heading"><p>MSRC 2027</p><h1>{mode === "staff" ? copy.title : mode === "judge" ? copy.judgeTitle : copy.reviewTitle}</h1></header>{state.profile ? <StaffCompetitionWorkspace locale={mode === "staff" ? locale : "en"} mode={mode} roles={state.profile.roles} /> : <p role="status"><a href={`/${locale}/staff/sign-in`}>{copy.denied}</a></p>}</div>;
}
