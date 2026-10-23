import { StaffPage } from "@/features/staff-portal/staff-page";
export const metadata = { title: "MSRC 2027 | Abstract review" };
export default function Page({ params }: { params: Promise<{ locale: string }> }) { return <StaffPage params={params} screen="home" landing="review" />; }
