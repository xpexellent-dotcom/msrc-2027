import { handleStaffRequest } from "@/features/staff-portal/handler.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = handleStaffRequest;
export const POST = handleStaffRequest;
export const HEAD = handleStaffRequest;
export const PUT = handleStaffRequest;
export const PATCH = handleStaffRequest;
export const DELETE = handleStaffRequest;
export const OPTIONS = handleStaffRequest;
