import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getStaffConfig } from "@/features/staff-portal/config.server";
import "@/styles/staff-portal.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "MSRC 2027 | Staff portal", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
export default async function StaffLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if (getStaffConfig().state !== "ready" || !isLocale((await params).locale)) notFound();
  return children;
}
