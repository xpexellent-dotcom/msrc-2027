import { handleMediaRequest } from "@/features/staff-portal/media-handler.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const GET = handleMediaRequest;
export const POST = handleMediaRequest;
export const PUT = handleMediaRequest;
export const PATCH = handleMediaRequest;
export const DELETE = handleMediaRequest;
export const OPTIONS = handleMediaRequest;
