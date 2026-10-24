import { ResearchStaffPage } from "@/features/research-judging/staff-page.server";
export const dynamic = "force-dynamic";
export const metadata = { title: "MSRC 2027 | Research event judging", robots: { index: false, follow: false, noarchive: true } };
export default function Page({ params }: { params: Promise<{ locale: string }> }) { return <ResearchStaffPage params={params} mode="judge" />; }
