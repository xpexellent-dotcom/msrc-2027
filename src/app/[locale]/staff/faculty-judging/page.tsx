import { StaffPage } from "@/features/staff-portal/staff-page";
import { ResearchStaffPage } from "@/features/research-judging/staff-page.server";
export default function Page({ params }: { params: Promise<{ locale: string }> }) { return process.env.RESEARCH_JUDGING_ENABLED === "true" ? <ResearchStaffPage params={params} mode="judge" /> : <StaffPage params={params} screen="home" landing="faculty-judging" />; }
