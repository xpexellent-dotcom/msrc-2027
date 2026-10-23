import { handleAnnouncementRequest } from "@/features/announcements/staff-handler.server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = handleAnnouncementRequest;
export const POST = handleAnnouncementRequest;
export const PUT = handleAnnouncementRequest;
export const PATCH = handleAnnouncementRequest;
export const DELETE = handleAnnouncementRequest;
export const OPTIONS = handleAnnouncementRequest;
