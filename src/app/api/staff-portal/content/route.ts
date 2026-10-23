import { handleContentRequest } from "@/features/staff-portal/content-handler.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = handleContentRequest;
export const POST = handleContentRequest;
export const PUT = handleContentRequest;
export const PATCH = handleContentRequest;
export const DELETE = handleContentRequest;
export const OPTIONS = handleContentRequest;
