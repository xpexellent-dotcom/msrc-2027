import { StaffPage } from "@/features/staff-portal/staff-page";
export default function Page({ params }: { params: Promise<{ locale: string }> }) { return <StaffPage params={params} screen="people" />; }
