import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getStaffConfig } from "@/features/staff-portal/config.server";
import { staffCopy } from "@/features/staff-portal/copy";
import "@/styles/staff-portal.css";
import "@/styles/staff-console.css";
import "@/styles/staff-media.css";
import "@/styles/staff-content.css";
import "@/styles/staff-research.css";
import "@/features/announcements/staff.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const portal = staffCopy[isLocale(locale) ? locale : "en"].portal;
  return { title: `MSRC 2027 | ${portal}`, robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
}
export default async function StaffLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if (getStaffConfig().state !== "ready" || !isLocale((await params).locale)) notFound();
  return children;
}
