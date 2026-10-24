import { CompetitionStaffPage } from "@/features/competitions/staff-page.server";
export const dynamic = "force-dynamic";
export const metadata = { title: "MSRC 2027 | Competition administration", robots: { index: false, follow: false, noarchive: true } };
export default function Page({ params }: { params: Promise<{ locale: string }> }) { return <CompetitionStaffPage params={params} />; }
