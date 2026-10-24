import { StaffPage } from "@/features/staff-portal/staff-page";
import { researchStaffCopy } from "@/features/research-judging/staff-copy";
import { isLocale } from "@/lib/i18n";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <>{process.env.RESEARCH_JUDGING_ENABLED === "true" && isLocale(locale) ? <nav className="staff-portal"><a href={`/${locale}/staff/research-judging`}>{researchStaffCopy[locale].title}</a></nav> : null}<StaffPage params={params} screen="home" landing="science" /></>;
}
