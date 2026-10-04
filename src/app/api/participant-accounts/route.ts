import { handleParticipantRequest } from "@/features/participant-accounts/handler.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = handleParticipantRequest;
export const POST = handleParticipantRequest;
export const HEAD = handleParticipantRequest;
export const PUT = handleParticipantRequest;
export const PATCH = handleParticipantRequest;
export const DELETE = handleParticipantRequest;
export const OPTIONS = handleParticipantRequest;
